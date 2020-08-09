import {
    getConnection,
    getMetadataArgsStorage,
    TreeRepository,
    EntityManager,
} from "../..";
import { TransactionOptions } from "../options/TransactionOptions";
import { IsolationLevel } from "../../driver/types/IsolationLevel";

/**
 * Wraps some method into the transaction.
 *
 * Method result will return a promise if this decorator applied.
 * All database operations in the wrapped method should be executed using entity managed passed
 * as a first parameter into the wrapped method.
 *
 * If you want to control at what position in your method parameters entity manager should be injected,
 * then use @TransactionEntityManager() decorator.
 *
 * If you want to use repositories instead of bare entity manager,
 * then use @TransactionRepository() decorator.
 */
export function Transaction(connectionName?: string): MethodDecorator;
export function Transaction(options?: TransactionOptions): MethodDecorator;
export function Transaction(
    connectionOrOptions?: string | TransactionOptions
): MethodDecorator {
    return function (
        target: Record<string, any>,
        methodName: string,
        descriptor: PropertyDescriptor
    ) {
        // save original method - we gonna need it
        const originalMethod = descriptor.value;

        // override method descriptor with proxy method
        descriptor.value = function (...args: any[]) {
            let connectionName = "default";
            let isolationLevel: IsolationLevel | undefined;
            if (connectionOrOptions) {
                if (typeof connectionOrOptions === "string") {
                    connectionName = connectionOrOptions;
                } else {
                    if (connectionOrOptions.connectionName) {
                        connectionName = connectionOrOptions.connectionName;
                    }
                    if (connectionOrOptions.isolation) {
                        isolationLevel = connectionOrOptions.isolation;
                    }
                }
            }

            const transactionCallback = (entityManager: EntityManager) => {
                let argsWithInjectedTransactionManagerAndRepositories: any[];

                // filter all @TransactionEntityManager() and @TransactionRepository() decorator usages for this method
                const transactionEntityManagerMetadatas = getMetadataArgsStorage()
                    .filterTransactionEntityManagers(
                        target.constructor,
                        methodName
                    )
                    .reverse();
                const transactionRepositoryMetadatas = getMetadataArgsStorage()
                    .filterTransactionRepository(target.constructor, methodName)
                    .reverse();

                // if there are @TransactionEntityManager() decorator usages the inject them
                if (transactionEntityManagerMetadatas.length > 0) {
                    argsWithInjectedTransactionManagerAndRepositories = [
                        ...args,
                    ];
                    // replace method params with injection of transactionEntityManager
                    transactionEntityManagerMetadatas.forEach((metadata) => {
                        argsWithInjectedTransactionManagerAndRepositories.splice(
                            metadata.index,
                            0,
                            entityManager
                        );
                    });
                } else if (transactionRepositoryMetadatas.length === 0) {
                    // otherwise if there's no transaction repositories in use, inject it as a first parameter
                    argsWithInjectedTransactionManagerAndRepositories = [
                        entityManager,
                        ...args,
                    ];
                } else {
                    argsWithInjectedTransactionManagerAndRepositories = [
                        ...args,
                    ];
                }

                // for every usage of @TransactionRepository decorator
                transactionRepositoryMetadatas.forEach((metadata) => {
                    let repositoryInstance: any;

                    // detect type of the repository and get instance from transaction entity manager
                    if (metadata.entityType) {
                        if (metadata.repositoryType === TreeRepository) {
                            repositoryInstance = entityManager.getTreeRepository(
                                metadata.entityType!
                            );
                        } else {
                            repositoryInstance = entityManager.getRepository(
                                metadata.entityType!
                            );
                        }
                    } else {
                        repositoryInstance = entityManager.getCustomRepository(
                            metadata.repositoryType
                        );
                    }

                    // replace method param with injection of repository instance
                    argsWithInjectedTransactionManagerAndRepositories.splice(
                        metadata.index,
                        0,
                        repositoryInstance
                    );
                });

                return originalMethod.apply(
                    this,
                    argsWithInjectedTransactionManagerAndRepositories
                );
            };
            if (isolationLevel) {
                return getConnection(connectionName).manager.transaction(
                    isolationLevel,
                    transactionCallback
                );
            }
            return getConnection(connectionName).manager.transaction(
                transactionCallback
            );
        };
    };
}
