/* eslint-disable complexity */
import { forEach } from "lodash";

function joinPaths(...paths: Array<string | number>): string {
  return paths
    .join("/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\//, "")
    .replace(/\/$/, "");
}

export type DataSchemaWalkerArgs = {
  dataRef: string;
  entityType?: string;
  relationType?: string;
  subschema: any;
};
export type DataSchemaWalker = (args: DataSchemaWalkerArgs) => boolean;

export function walkJsonSchema7({
  dataRef = "",
  dataSchema,
  entityType,
  relationType,
  walk,
}: {
  dataRef?: string;
  dataSchema?: any;
  entityType?: string;
  relationType?: string;
  walk: DataSchemaWalker;
}): void {
  if (!dataSchema) {
    return;
  }

  const { items: itemSchema, properties, oneOf, type: schemaType } = dataSchema;

  const shouldWalkChildren = walk({
    dataRef,
    entityType,
    subschema: dataSchema,
    relationType,
  });
  if (!shouldWalkChildren) {
    return;
  }

  if (schemaType === "object" && properties) {
    forEach(properties, (propertySchema: any, propertyName: string) => {
      walkJsonSchema7({
        dataRef: joinPaths(dataRef, propertyName),
        dataSchema: propertySchema,
        entityType,
        relationType,
        walk,
      });
    });
  } else if (schemaType === "array" && itemSchema) {
    walkJsonSchema7({
      dataRef: joinPaths(dataRef, "*"),
      dataSchema: itemSchema,
      entityType,
      relationType,
      walk,
    });
  } else if (schemaType === "object" && oneOf) {
    forEach(oneOf, (propertySchema: any) => {
      walkJsonSchema7({
        dataRef: joinPaths(dataRef),
        dataSchema: propertySchema,
        entityType,
        relationType,
        walk,
      });
    });
  }
}
