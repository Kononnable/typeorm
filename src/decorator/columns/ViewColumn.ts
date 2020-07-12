import { getMetadataArgsStorage } from "../..";
import { ColumnMetadataArgs } from "../../metadata-args/ColumnMetadataArgs";
import { ViewColumnOptions } from "../options/ViewColumnOptions";

/**
 * ViewColumn decorator is used to mark a specific class property as a view column.
 */
export function ViewColumn(options?: ViewColumnOptions): Function {
    return function (object: Object, propertyName: string) {
        getMetadataArgsStorage().columns.push({
            target: object.constructor,
            propertyName,
            mode: "regular",
            options: options || {},
        } as ColumnMetadataArgs);
    };
}
