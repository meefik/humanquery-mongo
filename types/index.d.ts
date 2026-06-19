/**
 * A MongoDB query object or primitive value.
 */
type MongoQuery = {
  [key: string]: MongoValue | MongoQuery | (MongoValue | MongoQuery)[];
};

/**
 * A value that can appear in a MongoDB query.
 */
type MongoValue = MongoQuery | string | number | boolean | null | Date;

/**
 * Converts a human-readable search query string into a MongoDB query object.
 *
 * @param str The search query string.
 * @returns The MongoDB query object, or null if the input is invalid.
 */
export default function convert(str: string): MongoQuery | null;
