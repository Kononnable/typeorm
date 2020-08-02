import * as yargs from "yargs";
import { Connection, QueryRunner, createConnection } from "typeorm-core";
import { PlatformTools } from "typeorm-core/build/compiled/src/platform/PlatformTools";
import { ConnectionOptionsReader } from "typeorm-options-reader";
import highlight from "cli-highlight";

const chalk = require("chalk");

/**
 * Executes an sql query on the given connection.
 */
export class QueryCommand implements yargs.CommandModule {
    command = "query";

    describe =
        "Executes given SQL query on a default connection. Specify connection name to run query on a specific connection.";

    builder(args: yargs.Argv) {
        return args
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection on which to run a query.",
            })
            .option("f", {
                alias: "config",
                default: "ormconfig",
                describe: "Name of the file with connection configuration.",
            });
    }

    async handler(args: yargs.Arguments) {
        let connection: Connection | undefined;
        let queryRunner: QueryRunner | undefined;
        try {
            // create a connection
            const connectionOptionsReader = new ConnectionOptionsReader({
                root: process.cwd(),
                configName: args.config as any,
            });
            const connectionOptions = await connectionOptionsReader.get(
                args.connection as any
            );
            Object.assign(connectionOptions, {
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: false,
            });
            connection = await createConnection(connectionOptions);

            // create a query runner and execute query using it
            queryRunner = connection.createQueryRunner("master");
            console.log(
                chalk.green("Running query: ") +
                    PlatformTools.highlightSql(args._[1])
            );
            const queryResult = await queryRunner.query(args._[1]);
            console.log(chalk.green("Query has been executed. Result: "));
            console.log(
                highlight(JSON.stringify(queryResult, undefined, 2), {
                    language: "json",
                })
            );

            await queryRunner.release();
            await connection.close();
        } catch (err) {
            if (queryRunner) await (queryRunner as QueryRunner).release();
            if (connection) await (connection as Connection).close();

            console.log(chalk.black.bgRed("Error during query execution:"));
            console.error(err);
            process.exit(1);
        }
    }
}
