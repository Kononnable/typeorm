import {
    ObjectLiteral,
    PostgresConnectionOptions,
    SqlServerConnectionOptions,
} from "typeorm-base";
import { Connection } from "../connection/Connection";
import { QueryRunner } from "../query-runner/QueryRunner";
import { Table } from "../schema-builder/table/Table";
import { QueryResultCache } from "./QueryResultCache";
import { QueryResultCacheOptions } from "./QueryResultCacheOptions";
import { isDriverSupported } from "../driver/Driver";

/**
 * Caches query result into current database, into separate table called "query-result-cache".
 */
export class DbQueryResultCache implements QueryResultCache {
    private queryResultCacheTable: string;

    constructor(protected connection: Connection) {
        const options = this.connection.driver.options as
            | SqlServerConnectionOptions
            | PostgresConnectionOptions;
        const cacheOptions =
            typeof this.connection.options.cache === "object"
                ? this.connection.options.cache
                : {};
        const cacheTableName = cacheOptions.tableName || "query-result-cache";

        this.queryResultCacheTable = this.connection.driver.buildTableName(
            cacheTableName,
            options.schema,
            options.database
        );
    }

    /**
     * Creates a connection with given cache provider.
     */
    async connect(): Promise<void> {}

    /**
     * Disconnects with given cache provider.
     */
    async disconnect(): Promise<void> {}

    /**
     * Creates table for storing cache if it does not exist yet.
     */
    async synchronize(queryRunner?: QueryRunner): Promise<void> {
        queryRunner = this.getQueryRunner(queryRunner);
        const { driver } = this.connection;
        const tableExist = await queryRunner.hasTable(
            this.queryResultCacheTable
        ); // todo: table name should be configurable
        if (tableExist) return;

        await queryRunner.createTable(
            new Table({
                name: this.queryResultCacheTable,
                columns: [
                    {
                        name: "id",
                        isPrimary: true,
                        isNullable: false,
                        type: driver.normalizeType({
                            type: driver.mappedDataTypes.cacheId,
                        }),
                        generationStrategy: "increment",
                        isGenerated: true,
                    },
                    {
                        name: "identifier",
                        type: driver.normalizeType({
                            type: driver.mappedDataTypes.cacheIdentifier,
                        }),
                        isNullable: true,
                    },
                    {
                        name: "time",
                        type: driver.normalizeType({
                            type: driver.mappedDataTypes.cacheTime,
                        }),
                        isPrimary: false,
                        isNullable: false,
                    },
                    {
                        name: "duration",
                        type: driver.normalizeType({
                            type: driver.mappedDataTypes.cacheDuration,
                        }),
                        isPrimary: false,
                        isNullable: false,
                    },
                    {
                        name: "query",
                        type: driver.normalizeType({
                            type: driver.mappedDataTypes.cacheQuery,
                        }),
                        isPrimary: false,
                        isNullable: false,
                    },
                    {
                        name: "result",
                        type: driver.normalizeType({
                            type: driver.mappedDataTypes.cacheResult,
                        }),
                        isNullable: false,
                    },
                ],
            })
        );
    }

    /**
     * Caches given query result.
     * Returns cache result if found.
     * Returns undefined if result is not cached.
     */
    getFromCache(
        options: QueryResultCacheOptions,
        queryRunner?: QueryRunner
    ): Promise<QueryResultCacheOptions | undefined> {
        queryRunner = this.getQueryRunner(queryRunner);
        const qb = this.connection
            .createQueryBuilder(queryRunner)
            .select()
            .from(this.queryResultCacheTable, "cache");

        if (options.identifier) {
            return qb
                .where(
                    `${qb.escape("cache")}.${qb.escape(
                        "identifier"
                    )} = :identifier`
                )
                .setParameters({
                    identifier: isDriverSupported(
                        ["mssql"],
                        this.connection.driver.type
                    )
                        ? this.connection.driver.createNativeParameter(
                              { type: "string" },
                              options.identifier
                          )
                        : options.identifier,
                })
                .getRawOne();
        }
        if (options.query) {
            if (isDriverSupported(["oracle"], this.connection.driver.type)) {
                return qb
                    .where(
                        `dbms_lob.compare(${qb.escape("cache")}.${qb.escape(
                            "query"
                        )}, :query) = 0`,
                        { query: options.query }
                    )
                    .getRawOne();
            }

            return qb
                .where(`${qb.escape("cache")}.${qb.escape("query")} = :query`)
                .setParameters({
                    query: isDriverSupported(
                        ["mssql"],
                        this.connection.driver.type
                    )
                        ? this.connection.driver.createNativeParameter(
                              { type: "string" },
                              options.query
                          )
                        : options.query,
                })
                .getRawOne();
        }

        return Promise.resolve(undefined);
    }

    /**
     * Checks if cache is expired or not.
     */
    isExpired(savedCache: QueryResultCacheOptions): boolean {
        const duration =
            typeof savedCache.duration === "string"
                ? parseInt(savedCache.duration)
                : savedCache.duration;
        return (
            (typeof savedCache.time === "string"
                ? parseInt(savedCache.time as any)
                : savedCache.time)! +
                duration <
            new Date().getTime()
        );
    }

    /**
     * Stores given query result in the cache.
     */
    async storeInCache(
        options: QueryResultCacheOptions,
        savedCache: QueryResultCacheOptions | undefined,
        queryRunner?: QueryRunner
    ): Promise<void> {
        queryRunner = this.getQueryRunner(queryRunner);

        let insertedValues: ObjectLiteral = options;
        if (isDriverSupported(["mssql"], this.connection.driver.type)) {
            // todo: bad abstraction, re-implement this part, probably better if we create an entity metadata for cache table
            insertedValues = {
                identifier: this.connection.driver.createNativeParameter(
                    { type: "string" },
                    options.identifier
                ),
                time: this.connection.driver.createNativeParameter(
                    { type: "bigint" },
                    options.time
                ),
                duration: this.connection.driver.createNativeParameter(
                    { type: "integer" },
                    options.duration
                ),
                query: this.connection.driver.createNativeParameter(
                    { type: "string" },
                    options.query
                ),
                result: this.connection.driver.createNativeParameter(
                    { type: "string" },
                    options.result
                ),
            };
        }

        if (savedCache && savedCache.identifier) {
            // if exist then update
            const qb = queryRunner.manager
                .createQueryBuilder()
                .update(this.queryResultCacheTable)
                .set(insertedValues);

            qb.where(`${qb.escape("identifier")} = :condition`, {
                condition: insertedValues.identifier,
            });
            await qb.execute();
        } else if (savedCache && savedCache.query) {
            // if exist then update
            const qb = queryRunner.manager
                .createQueryBuilder()
                .update(this.queryResultCacheTable)
                .set(insertedValues);

            if (isDriverSupported(["oracle"], this.connection.driver.type)) {
                qb.where(`dbms_lob.compare("query", :condition) = 0`, {
                    condition: insertedValues.query,
                });
            } else {
                qb.where(`${qb.escape("query")} = :condition`, {
                    condition: insertedValues.query,
                });
            }

            await qb.execute();
        } else {
            // otherwise insert
            await queryRunner.manager
                .createQueryBuilder()
                .insert()
                .into(this.queryResultCacheTable)
                .values(insertedValues)
                .execute();
        }
    }

    /**
     * Clears everything stored in the cache.
     */
    async clear(queryRunner: QueryRunner): Promise<void> {
        return this.getQueryRunner(queryRunner).clearTable(
            this.queryResultCacheTable
        );
    }

    /**
     * Removes all cached results by given identifiers from cache.
     */
    async remove(
        identifiers: string[],
        queryRunner?: QueryRunner
    ): Promise<void> {
        await Promise.all(
            identifiers.map((identifier) => {
                const qb = this.getQueryRunner(
                    queryRunner
                ).manager.createQueryBuilder();
                return qb
                    .delete()
                    .from(this.queryResultCacheTable)
                    .where(`${qb.escape("identifier")} = :identifier`, {
                        identifier,
                    })
                    .execute();
            })
        );
    }

    /**
     * Gets a query runner to work with.
     */
    protected getQueryRunner(
        queryRunner: QueryRunner | undefined
    ): QueryRunner {
        if (queryRunner) return queryRunner;

        return this.connection.createQueryRunner("master");
    }
}
