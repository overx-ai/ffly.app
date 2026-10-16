export type Schema = {
  type?: string;
  $ref?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  additionalProperties?: Schema;
  anyOf?: Schema[];
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  minItems?: number;
  default?: unknown;
};

// The subset of JSON Schema the pinned ffly API shapes use, over one set of named schemas; every problem is reported by
// its path.
export function schemaProblems(schemas: Record<string, Schema>) {
  const resolve = (schema: Schema): Schema => (schema.$ref ? schemas[schema.$ref.split('/').at(-1)!] : schema);
  return function problems(value: unknown, raw: Schema, path = 'value'): string[] {
    const schema = resolve(raw);
    if (schema.anyOf) return schema.anyOf.some((option) => !problems(value, option, path).length) ? [] : [`${path}: matches no anyOf`];
    switch (schema.type) {
      case 'null':
        return value === null ? [] : [`${path}: not null`];
      case 'integer':
      case 'number': {
        if (typeof value !== 'number' || (schema.type === 'integer' && !Number.isInteger(value))) return [`${path}: not ${schema.type}`];
        const low = schema.minimum !== undefined && value < schema.minimum;
        const high = schema.maximum !== undefined && value > schema.maximum;
        return low || high ? [`${path}: out of range`] : [];
      }
      case 'string': {
        if (typeof value !== 'string') return [`${path}: not a string`];
        const bad = (schema.pattern && !new RegExp(schema.pattern).test(value)) || (schema.maxLength !== undefined && value.length > schema.maxLength) || (schema.minLength !== undefined && value.length < schema.minLength);
        return bad ? [`${path}: ${value} breaks the string rules`] : [];
      }
      case 'array': {
        if (!Array.isArray(value)) return [`${path}: not an array`];
        if (schema.maxItems !== undefined && value.length > schema.maxItems) return [`${path}: too many items`];
        return value.flatMap((item, i) => problems(item, schema.items!, `${path}[${i}]`));
      }
      case 'object':
      case undefined: {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${path}: not an object`];
        const entries = Object.entries(value);
        const missing = (schema.required ?? []).filter((key) => !(key in value)).map((key) => `${path}.${key}: missing`);
        return [
          ...missing,
          ...entries.flatMap(([key, item]) => {
            const property = schema.properties?.[key] ?? schema.additionalProperties;
            return property ? problems(item, property, `${path}.${key}`) : [`${path}.${key}: not in the schema`];
          }),
        ];
      }
      default:
        return [];
    }
  };
}
