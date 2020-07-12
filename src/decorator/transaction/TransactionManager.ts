import { getMetadataArgsStorage } from "../..";
import { TransactionEntityMetadataArgs } from "../../metadata-args/TransactionEntityMetadataArgs";

/**
 * Injects transaction's entity manager into the method wrapped with @Transaction decorator.
 */
export function TransactionManager(): Function {
    return function (object: Object, methodName: string, index: number) {
        getMetadataArgsStorage().transactionEntityManagers.push({
            target: object.constructor,
            methodName,
            index,
        } as TransactionEntityMetadataArgs);
    };
}
