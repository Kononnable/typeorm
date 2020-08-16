import { QueryRunnerAlreadyReleasedError } from "../../error/QueryRunnerAlreadyReleasedError";
import { AbstractSqliteQueryRunner } from "../sqlite-abstract/AbstractSqliteQueryRunner";
import { SqljsDriver } from "./SqljsDriver";
import { Broadcaster } from "../../subscriber/Broadcaster";
import { QueryFailedError } from "../../error/QueryFailedError";

/**
 * Runs queries on a single sqlite database connection.
 */
export class SqljsQueryRunner extends AbstractSqliteQueryRunner {
    /**
     * Database driver used by connection.
     */
    driver: SqljsDriver;

    constructor(driver: SqljsDriver) {
        super();
        this.driver = driver;
        this.connection = driver.connection;
        this.broadcaster = new Broadcaster(this);
    }

    /**
     * Commits transaction.
     * Error will be thrown if transaction was not started.
     */
    async commitTransaction(): Promise<void> {
        await super.commitTransaction();
        await this.driver.autoSave();
    }

    /**
     * Executes a given SQL query.
     */
    async query(query: string, parameters: any[] = []): Promise<any> {
        if (this.isReleased) throw new QueryRunnerAlreadyReleasedError();
        const { databaseConnection } = this.driver;
        this.driver.connection.logger.logQuery(query, parameters, this);
        const queryStartTime = +new Date();
        let statement: any;
        try {
            statement = databaseConnection.prepare(query);
            if (parameters) {
                statement.bind(parameters);
            }

            // log slow queries if maxQueryExecution time is set
            const {
                maxQueryExecutionTime,
            } = this.driver.connection.options;
            const queryEndTime = +new Date();
            const queryExecutionTime = queryEndTime - queryStartTime;
            if (
                maxQueryExecutionTime &&
                queryExecutionTime > maxQueryExecutionTime
            )
                this.driver.connection.logger.logQuerySlow(
                    queryExecutionTime,
                    query,
                    parameters,
                    this
                );

            const result: any[] = [];

            while (statement.step()) {
                result.push(statement.getAsObject());
            }

            statement.free();
            if (!this.isTransactionActive && !query.trim().toLowerCase().startsWith("select ")) {
                await this.driver.autoSave();
            }
            return result;
        } catch (e) {
            if (statement) {
                statement.free();
            }

            this.driver.connection.logger.logQueryError(
                e,
                query,
                parameters,
                this
            );
            throw new QueryFailedError(query, parameters, e);
        }
    }
}
