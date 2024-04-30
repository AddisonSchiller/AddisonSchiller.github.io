/* eslint-disable complexity */
import { forEach, cloneDeep, sortedUniq, sortBy, merge } from "lodash";

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

  const { items: itemSchema, properties, type: schemaType } = dataSchema;

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
  }
}

function doubleWalkerMerger(schema1: any, schema2: any, dataRef?: string) {
  if (!schema1 || !schema2) {
    return;
  }
  const {
    items: items1,
    properties: properties1,
    type: schemaType1,
    enum: enum1,
  } = schema1;
  const {
    items: items2,
    properties: properties2,
    type: schemaType2,
    enum: enum2,
  } = schema2;

  if (!items1 && !properties1 && !schemaType1 && !enum1) {
    merge(schema1, schema2);
    return;
  }
  if (schemaType1 && schemaType2 && schemaType1 !== schemaType2) {
    return;
  }

  if (enum1 && enum2) {
    schema1.enum = sortedUniq(sortBy([...enum1, ...enum2]));
    merge(schema1.$enumMeta, schema2.$enumMeta);
    return;
  }

  if (schemaType2 === "object" && properties2) {
    forEach(properties2, (propertySchema: any, propertyName: string) => {
      if (!properties1[propertyName]) {
        properties1[propertyName] = propertySchema;
      } else {
        doubleWalkerMerger(
          properties1[propertyName],
          propertySchema,
          joinPaths(dataRef || "", propertyName)
        );
      }
    });
  } else if (schemaType2 === "array" && items2) {
    doubleWalkerMerger(items1, items2, joinPaths(dataRef || "", "*"));
  }
}

export function deepCloneAndMergeLeft(schema1: any, schema2: any): any {
  const clonedSchema = cloneDeep(JSON.parse(schema1));
  doubleWalkerMerger(clonedSchema, JSON.parse(schema2));

  return clonedSchema;
}
