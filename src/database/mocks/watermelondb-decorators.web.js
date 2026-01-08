/**
 * WatermelonDB decorators web stub
 *
 * Provides no-op decorator implementations for web platform E2E testing.
 * Decorators simply pass through without modification.
 */

// No-op decorator factory - returns property descriptor unchanged
function noopDecorator(_columnName) {
  return function (_target, _propertyKey, descriptor) {
    return descriptor;
  };
}

// No-op method decorator
function noopMethodDecorator(_target, _propertyKey, descriptor) {
  return descriptor;
}

// Export decorators as no-ops
const field = noopDecorator;
const text = noopDecorator;
const children = noopDecorator;
const relation = (_tableName, _foreignKey) => noopDecorator();
const writer = noopMethodDecorator;
const reader = noopMethodDecorator;
const action = noopMethodDecorator;
const readonly = noopDecorator;
const lazy = noopDecorator;
const date = noopDecorator;
const json = (_sanitizer) => noopDecorator;
const immutableRelation = (_tableName, _foreignKey) => noopDecorator();
const nochange = noopDecorator;

module.exports = {
  field,
  text,
  children,
  relation,
  writer,
  reader,
  action,
  readonly,
  lazy,
  date,
  json,
  immutableRelation,
  nochange,
};
