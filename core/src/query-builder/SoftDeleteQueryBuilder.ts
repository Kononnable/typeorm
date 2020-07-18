import { QueryBuilder } from "./QueryBuilder";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { ObjectType } from "../common/ObjectType";
import { Connection } from "../connection/Connection";
import { QueryRunner } from "../query-runner/QueryRunner";
import { WhereExpression } from "./WhereExpression";
import { Brackets } from "./Brackets";
import { UpdateResult } from "./result/UpdateResult";
import { ReturningStatementNotSupportedError } from "../error/ReturningStatementNotSupportedError";
import { ReturningResultsEntityUpdator } from "./ReturningResultsEntityUpdator";
import { SqljsDriver } from "../driver/sqljs/SqljsDriver";
import { BroadcasterResult } from "../subscriber/BroadcasterResult";
import { OrderByCondition } from "../find-options/OrderByCondition";
import { LimitOnUpdateNotSupportedError } from "../error/LimitOnUpdateNotSupportedError";
import { MissingDeleteDateColumnError } from "../error/MissingDeleteDateColumnError";
import { UpdateValuesMissingError } from "../error/UpdateValuesMissingError";
import { EntitySchema } from "../entity-schema/EntitySchema";
import { isDriverSupported } from "../driver/Driver";

/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
export class SoftDeleteQueryBuilder<Entity> extends QueryBuilder<Entity>
    implements WhereExpression {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(
        connectionOrQueryBuilder: Connection | QueryBuilder<any>,
        queryRunner?: QueryRunner
    ) {
        super(connectionOrQueryBuilder as any, queryRunner);
        this.expressionMap.aliasNamePrefixingEnabled = false;
    }

    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------

    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery(): string {
        let sql = this.createUpdateExpression();
        sql += this.createOrderByExpression();
        sql += this.createLimitExpression();
        return sql.trim();
    }

    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    async execute(): Promise<UpdateResult> {
        const queryRunner = this.obtainQueryRunner();
        let transactionStartedByUs: boolean = false;

        try {
            // start transaction if it was enabled
            if (
                this.expressionMap.useTransaction === true &&
                queryRunner.isTransactionActive === false
            ) {
                await queryRunner.startTransaction();
                transactionStartedByUs = true;
            }

            // call before updation methods in listeners and subscribers
            if (
                this.expressionMap.callListeners === true &&
                this.expressionMap.mainAlias!.hasMetadata
            ) {
                const broadcastResult = new BroadcasterResult();
                queryRunner.broadcaster.broadcastBeforeUpdateEvent(
                    broadcastResult,
                    this.expressionMap.mainAlias!.metadata
                );
                if (broadcastResult.promises.length > 0)
                    await Promise.all(broadcastResult.promises);
            }

            // if update entity mode is enabled we may need extra columns for the returning statement
            const returningResultsEntityUpdator = new ReturningResultsEntityUpdator(
                queryRunner,
                this.expressionMap
            );
            if (
                this.expressionMap.updateEntity === true &&
                this.expressionMap.mainAlias!.hasMetadata &&
                this.expressionMap.whereEntities.length > 0
            ) {
                this.expressionMap.extraReturningColumns = returningResultsEntityUpdator.getUpdationReturningColumns();
            }

            // execute update query
            const [sql, parameters] = this.getQueryAndParameters();
            const updateResult = new UpdateResult();
            const result = await queryRunner.query(sql, parameters);

            const { driver } = queryRunner.connection;
            if (isDriverSupported(["postgres"], driver.type)) {
                [updateResult.raw, updateResult.affected] = result;
            } else {
                updateResult.raw = result;
            }

            // if we are updating entities and entity updation is enabled we must update some of entity columns (like version, update date, etc.)
            if (
                this.expressionMap.updateEntity === true &&
                this.expressionMap.mainAlias!.hasMetadata &&
                this.expressionMap.whereEntities.length > 0
            ) {
                await returningResultsEntityUpdator.update(
                    updateResult,
                    this.expressionMap.whereEntities
                );
            }

            // call after updation methods in listeners and subscribers
            if (
                this.expressionMap.callListeners === true &&
                this.expressionMap.mainAlias!.hasMetadata
            ) {
                const broadcastResult = new BroadcasterResult();
                queryRunner.broadcaster.broadcastAfterUpdateEvent(
                    broadcastResult,
                    this.expressionMap.mainAlias!.metadata
                );
                if (broadcastResult.promises.length > 0)
                    await Promise.all(broadcastResult.promises);
            }

            // close transaction if we started it
            if (transactionStartedByUs) await queryRunner.commitTransaction();

            return updateResult;
        } catch (error) {
            // rollback transaction if we started it
            if (transactionStartedByUs) {
                try {
                    await queryRunner.rollbackTransaction();
                } catch (rollbackError) {
                    this.connection.logger.log(
                        "warn",
                        `Error during transaction rollback. ${rollbackError}`
                    );
                }
            }
            throw error;
        } finally {
            if (queryRunner !== this.queryRunner) {
                // means we created our own query runner
                await queryRunner.release();
            }
            if (
                this.connection.driver instanceof SqljsDriver &&
                !queryRunner.isTransactionActive
            ) {
                await this.connection.driver.autoSave();
            }
        }
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Specifies FROM which entity's table select/update/delete/soft-delete will be executed.
     * Also sets a main string alias of the selection data.
     */
    from<T>(
        entityTarget: ObjectType<T> | EntitySchema<T> | string,
        aliasName?: string
    ): SoftDeleteQueryBuilder<T> {
        entityTarget =
            entityTarget instanceof EntitySchema
                ? entityTarget.options.name
                : entityTarget;
        const mainAlias = this.createFromAlias(entityTarget, aliasName);
        this.expressionMap.setMainAlias(mainAlias);
        return (this as any) as SoftDeleteQueryBuilder<T>;
    }

    /**
     * Sets WHERE condition in the query builder.
     * If you had previously WHERE expression defined,
     * calling this function will override previously set WHERE conditions.
     * Additionally you can add parameters used in where expression.
     */
    where(
        where:
            | string
            | ((qb: this) => string)
            | Brackets
            | ObjectLiteral
            | ObjectLiteral[],
        parameters?: ObjectLiteral
    ): this {
        this.expressionMap.wheres = []; // don't move this block below since computeWhereParameter can add where expressions
        const condition = this.computeWhereParameter(where);
        if (condition)
            this.expressionMap.wheres = [{ type: "simple", condition }];
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    andWhere(
        where: string | ((qb: this) => string) | Brackets,
        parameters?: ObjectLiteral
    ): this {
        this.expressionMap.wheres.push({
            type: "and",
            condition: this.computeWhereParameter(where),
        });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new OR WHERE condition in the query builder.
     * Additionally you can add parameters used in where expression.
     */
    orWhere(
        where: string | ((qb: this) => string) | Brackets,
        parameters?: ObjectLiteral
    ): this {
        this.expressionMap.wheres.push({
            type: "or",
            condition: this.computeWhereParameter(where),
        });
        if (parameters) this.setParameters(parameters);
        return this;
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    whereInIds(ids: any | any[]): this {
        return this.where(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new AND WHERE with conditions for the given ids.
     */
    andWhereInIds(ids: any | any[]): this {
        return this.andWhere(this.createWhereIdsExpression(ids));
    }

    /**
     * Adds new OR WHERE with conditions for the given ids.
     */
    orWhereInIds(ids: any | any[]): this {
        return this.orWhere(this.createWhereIdsExpression(ids));
    }

    /**
     * Optional returning/output clause.
     * This will return given column values.
     */
    output(columns: string[]): this;

    /**
     * Optional returning/output clause.
     * Returning is a SQL string containing returning statement.
     */
    output(output: string): this;

    /**
     * Optional returning/output clause.
     */
    output(output: string | string[]): this;

    /**
     * Optional returning/output clause.
     */
    output(output: string | string[]): this {
        return this.returning(output);
    }

    /**
     * Optional returning/output clause.
     * This will return given column values.
     */
    returning(columns: string[]): this;

    /**
     * Optional returning/output clause.
     * Returning is a SQL string containing returning statement.
     */
    returning(returning: string): this;

    /**
     * Optional returning/output clause.
     */
    returning(returning: string | string[]): this;

    /**
     * Optional returning/output clause.
     */
    returning(returning: string | string[]): this {
        // not all databases support returning/output cause
        if (!this.connection.driver.isReturningSqlSupported())
            throw new ReturningStatementNotSupportedError();

        this.expressionMap.returning = returning;
        return this;
    }

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     *
     * Calling order by without order set will remove all previously set order bys.
     */
    orderBy(): this;

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(
        sort: string,
        order?: "ASC" | "DESC",
        nulls?: "NULLS FIRST" | "NULLS LAST"
    ): this;

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(order: OrderByCondition): this;

    /**
     * Sets ORDER BY condition in the query builder.
     * If you had previously ORDER BY expression defined,
     * calling this function will override previously set ORDER BY conditions.
     */
    orderBy(
        sort?: string | OrderByCondition,
        order: "ASC" | "DESC" = "ASC",
        nulls?: "NULLS FIRST" | "NULLS LAST"
    ): this {
        if (sort) {
            if (sort instanceof Object) {
                this.expressionMap.orderBys = sort as OrderByCondition;
            } else if (nulls) {
                this.expressionMap.orderBys = {
                    [sort as string]: { order, nulls },
                };
            } else {
                this.expressionMap.orderBys = { [sort as string]: order };
            }
        } else {
            this.expressionMap.orderBys = {};
        }
        return this;
    }

    /**
     * Adds ORDER BY condition in the query builder.
     */
    addOrderBy(
        sort: string,
        order: "ASC" | "DESC" = "ASC",
        nulls?: "NULLS FIRST" | "NULLS LAST"
    ): this {
        if (nulls) {
            this.expressionMap.orderBys[sort] = { order, nulls };
        } else {
            this.expressionMap.orderBys[sort] = order;
        }
        return this;
    }

    /**
     * Sets LIMIT - maximum number of rows to be selected.
     */
    limit(limit?: number): this {
        this.expressionMap.limit = limit;
        return this;
    }

    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    whereEntity(entity: Entity | Entity[]): this {
        if (!this.expressionMap.mainAlias!.hasMetadata)
            throw new Error(
                `.whereEntity method can only be used on queries which update real entity table.`
            );

        this.expressionMap.wheres = [];
        const entities: Entity[] = Array.isArray(entity) ? entity : [entity];
        entities.forEach((entity) => {
            const entityIdMap = this.expressionMap.mainAlias!.metadata.getEntityIdMap(
                entity
            );
            if (!entityIdMap)
                throw new Error(
                    `Provided entity does not have ids set, cannot perform operation.`
                );

            this.orWhereInIds(entityIdMap);
        });

        this.expressionMap.whereEntities = entities;
        return this;
    }

    /**
     * Indicates if entity must be updated after update operation.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    updateEntity(enabled: boolean): this {
        this.expressionMap.updateEntity = enabled;
        return this;
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Creates UPDATE express used to perform insert query.
     */
    protected createUpdateExpression() {
        const metadata = this.expressionMap.mainAlias!.hasMetadata
            ? this.expressionMap.mainAlias!.metadata
            : undefined;
        if (!metadata)
            throw new Error(
                `Cannot get entity metadata for the given alias "${this.expressionMap.mainAlias}"`
            );
        if (!metadata.deleteDateColumn) {
            throw new MissingDeleteDateColumnError(metadata);
        }

        // prepare columns and values to be updated
        const updateColumnAndValues: string[] = [];
        const newParameters: ObjectLiteral = {};

        switch (this.expressionMap.queryType) {
            case "soft-delete":
                updateColumnAndValues.push(
                    `${this.escape(
                        metadata.deleteDateColumn.databaseName
                    )} = CURRENT_TIMESTAMP`
                );
                break;
            case "restore":
                updateColumnAndValues.push(
                    `${this.escape(
                        metadata.deleteDateColumn.databaseName
                    )} = NULL`
                );
                break;
            default:
                throw new Error(
                    `The queryType must be "soft-delete" or "restore"`
                );
        }
        if (metadata.versionColumn)
            updateColumnAndValues.push(
                `${this.escape(
                    metadata.versionColumn.databaseName
                )} = ${this.escape(metadata.versionColumn.databaseName)} + 1`
            );
        if (metadata.updateDateColumn)
            updateColumnAndValues.push(
                `${this.escape(
                    metadata.updateDateColumn.databaseName
                )} = CURRENT_TIMESTAMP`
            ); // todo: fix issue with CURRENT_TIMESTAMP(6) being used, can "DEFAULT" be used?!

        if (updateColumnAndValues.length <= 0) {
            throw new UpdateValuesMissingError();
        }

        // we re-write parameters this way because we want our "UPDATE ... SET" parameters to be first in the list of "nativeParameters"
        // because some drivers like mysql depend on order of parameters
        if (
            isDriverSupported(
                ["mysql", "oracle", "sqlite-abstract"],
                this.connection.driver.type
            )
        ) {
            this.expressionMap.nativeParameters = Object.assign(
                newParameters,
                this.expressionMap.nativeParameters
            );
        }

        // get a table name and all column database names
        const whereExpression = this.createWhereExpression();
        const returningExpression = this.createReturningExpression();

        // generate and return sql update query
        if (
            returningExpression &&
            isDriverSupported(
                ["postgres", "oracle", "cockroachdb"],
                this.connection.driver.type
            )
        ) {
            return `UPDATE ${this.getTableName(
                this.getMainTableName()
            )} SET ${updateColumnAndValues.join(
                ", "
            )}${whereExpression} RETURNING ${returningExpression}`;
        }
        if (
            returningExpression &&
            isDriverSupported(["mssql"], this.connection.driver.type)
        ) {
            return `UPDATE ${this.getTableName(
                this.getMainTableName()
            )} SET ${updateColumnAndValues.join(
                ", "
            )} OUTPUT ${returningExpression}${whereExpression}`;
        }
        return `UPDATE ${this.getTableName(
            this.getMainTableName()
        )} SET ${updateColumnAndValues.join(", ")}${whereExpression}`; // todo: how do we replace aliases in where to nothing?
    }

    /**
     * Creates "ORDER BY" part of SQL query.
     */
    protected createOrderByExpression() {
        const { orderBys } = this.expressionMap;
        if (Object.keys(orderBys).length > 0)
            return ` ORDER BY ${Object.keys(orderBys)
                .map((columnName) => {
                    if (typeof orderBys[columnName] === "string") {
                        return `${this.replacePropertyNames(columnName)} ${
                            orderBys[columnName]
                        }`;
                    }
                    return `${this.replacePropertyNames(columnName)} ${
                        (orderBys[columnName] as any).order
                    } ${(orderBys[columnName] as any).nulls}`;
                })
                .join(", ")}`;

        return "";
    }

    /**
     * Creates "LIMIT" parts of SQL query.
     */
    protected createLimitExpression(): string {
        const { limit } = this.expressionMap;

        if (limit) {
            if (isDriverSupported(["mysql"], this.connection.driver.type)) {
                return ` LIMIT ${limit}`;
            }
            throw new LimitOnUpdateNotSupportedError();
        }

        return "";
    }
}
