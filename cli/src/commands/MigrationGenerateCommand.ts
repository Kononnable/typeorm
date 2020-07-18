import * as yargs from "yargs";
import {
    Connection,
    createConnection,
} from "typeorm-core";
import { camelCase } from "typeorm-core/util/StringUtils";
import { ConnectionOptionsReader } from 'typeorm-options-reader';
import { isDriverSupported } from 'typeorm-core/driver/Driver';
import { CommandUtils } from "./CommandUtils";

const chalk = require("chalk");

/**
 * Generates a new migration file with sql needs to be executed to update schema.
 */
export class MigrationGenerateCommand implements yargs.CommandModule {
    command = "migration:generate";

    describe =
        "Generates a new migration file with sql needs to be executed to update schema.";

    aliases = "migrations:generate";

    builder(args: yargs.Argv) {
        return args
            .option("c", {
                alias: "connection",
                default: "default",
                describe: "Name of the connection on which run a query.",
            })
            .option("n", {
                alias: "name",
                describe: "Name of the migration class.",
                demand: true,
            })
            .option("d", {
                alias: "dir",
                describe: "Directory where migration should be created.",
            })
            .option("f", {
                alias: "config",
                default: "ormconfig",
                describe: "Name of the file with connection configuration.",
            });
    }

    async handler(args: yargs.Arguments) {
        if (args._[0] === "migrations:generate") {
            console.log(
                "'migrations:generate' is deprecated, please use 'migration:generate' instead"
            );
        }

        const timestamp = new Date().getTime();
        const filename = `${timestamp}-${args.name}.ts`;
        let directory = args.dir;

        // if directory is not set then try to open tsconfig and find default path there
        if (!directory) {
            try {
                const connectionOptionsReader = new ConnectionOptionsReader({
                    root: process.cwd(),
                    configName: args.config as any,
                });
                const connectionOptions = await connectionOptionsReader.get(
                    args.connection as any
                );
                directory = connectionOptions.cli
                    ? connectionOptions.cli.migrationsDir
                    : undefined;
                // eslint-disable-next-line no-empty
            } catch (err) {}
        }

        let connection: Connection | undefined;
        try {
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
            const sqlInMemory = await connection.driver
                .createSchemaBuilder()
                .log();
            const upSqls: string[] = [];
            const downSqls: string[] = [];

            // mysql is exceptional here because it uses ` character in to escape names in queries, that's why for mysql
            // we are using simple quoted string instead of template string syntax
            if (
                isDriverSupported(["mysql","aurora-data-api"],connection.driver.type)
            ) {
                sqlInMemory.upQueries.forEach((upQuery) => {
                    upSqls.push(
                        `        await queryRunner.query("${upQuery.query.replace(
                            new RegExp(`"`, "g"),
                            `\\"`
                        )}"${MigrationGenerateCommand.queryParams(
                            upQuery.parameters
                        )});`
                    );
                });
                sqlInMemory.downQueries.forEach((downQuery) => {
                    downSqls.push(
                        `        await queryRunner.query("${downQuery.query.replace(
                            new RegExp(`"`, "g"),
                            `\\"`
                        )}"${MigrationGenerateCommand.queryParams(
                            downQuery.parameters
                        )});`
                    );
                });
            } else {
                sqlInMemory.upQueries.forEach((upQuery) => {
                    upSqls.push(
                        `        await queryRunner.query(\`${upQuery.query.replace(
                            new RegExp("`", "g"),
                            "\\`"
                        )}\`${MigrationGenerateCommand.queryParams(
                            upQuery.parameters
                        )});`
                    );
                });
                sqlInMemory.downQueries.forEach((downQuery) => {
                    downSqls.push(
                        `        await queryRunner.query(\`${downQuery.query.replace(
                            new RegExp("`", "g"),
                            "\\`"
                        )}\`${MigrationGenerateCommand.queryParams(
                            downQuery.parameters
                        )});`
                    );
                });
            }

            if (upSqls.length) {
                if (args.name) {
                    const fileContent = MigrationGenerateCommand.getTemplate(
                        args.name as any,
                        timestamp,
                        upSqls,
                        downSqls.reverse()
                    );
                    const path = `${process.cwd()}/${
                        directory ? `${directory}/` : ""
                    }${filename}`;
                    await CommandUtils.createFile(path, fileContent);

                    console.log(
                        chalk.green(
                            `Migration ${chalk.blue(
                                path
                            )} has been generated successfully.`
                        )
                    );
                } else {
                    console.log(chalk.yellow("Please specify migration name"));
                }
            } else {
                console.log(
                    chalk.yellow(
                        `No changes in database schema were found - cannot generate a migration. To create a new empty migration use "typeorm migration:create" command`
                    )
                );
            }
            await connection.close();
        } catch (err) {
            if (connection) await (connection as Connection).close();

            console.log(
                chalk.black.bgRed("Error during migration generation:")
            );
            console.error(err);
            process.exit(1);
        }
    }

    // -------------------------------------------------------------------------
    // Protected Static Methods
    // -------------------------------------------------------------------------

    /**
     * Formats query parameters for migration queries if parameters actually exist
     */
    protected static queryParams(parameters: any[] | undefined): string {
        if (!parameters || !parameters.length) {
            return "";
        }

        return `, ${JSON.stringify(parameters)}`;
    }

    /**
     * Gets contents of the migration file.
     */
    protected static getTemplate(
        name: string,
        timestamp: number,
        upSqls: string[],
        downSqls: string[]
    ): string {
        const migrationName = `${camelCase(name, true)}${timestamp}`;

        return `import {MigrationInterface, QueryRunner} from "typeorm";

export class ${migrationName} implements MigrationInterface {
    name = '${migrationName}'

    public async up(queryRunner: QueryRunner): Promise<void> {
${upSqls.join(`
`)}
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
${downSqls.join(`
`)}
    }

}
`;
    }
}
