/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 */

'use strict';

import type {
  NamedShape,
  NativeModuleEventEmitterShape,
  NativeModuleFunctionTypeAnnotation,
  NativeModuleParamTypeAnnotation,
  NativeModulePropertyShape,
  NativeModuleReturnTypeAnnotation,
  Nullable,
  SchemaType,
} from '../../CodegenSchema';
import type {AliasResolver} from './Utils';

const {unwrapNullable} = require('../../parsers/parsers-commons');
const {wrapOptional} = require('../TypeUtils/Java');
const {toPascalCase} = require('../Utils');
const {createAliasResolver, getModules} = require('./Utils');

type FilesOutput = Map<string, string>;

function FileTemplate(
  config: $ReadOnly<{
    packageName: string,
    className: string,
    jsName: string,
    eventEmitters: string,
    methods: string,
    imports: string,
  }>,
): string {
  const {packageName, className, jsName, eventEmitters, methods, imports} =
    config;
  return `
/**
 * This code was generated by [react-native-codegen](https://www.npmjs.com/package/react-native-codegen).
 *
 * Do not edit this file as changes may cause incorrect behavior and will be lost
 * once the code is regenerated.
 *
 * ${'@'}generated by codegen project: GenerateModuleJavaSpec.js
 *
 * ${'@'}nolint
 */

package ${packageName};

${imports}

public abstract class ${className} extends ReactContextBaseJavaModule implements TurboModule {
  public static final String NAME = "${jsName}";

  public ${className}(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public @Nonnull String getName() {
    return NAME;
  }

${eventEmitters}${eventEmitters.length > 0 ? '\n\n' : ''}${methods}
}
`;
}

function EventEmitterTemplate(
  eventEmitter: NativeModuleEventEmitterShape,
  imports: Set<string>,
): string {
  return `  protected final void emit${toPascalCase(eventEmitter.name)}(${
    eventEmitter.typeAnnotation.typeAnnotation.type !== 'VoidTypeAnnotation'
      ? `${translateEventEmitterTypeToJavaType(eventEmitter, imports)} value`
      : ''
  }) {
    mEventEmitterCallback.invoke("${eventEmitter.name}"${
      eventEmitter.typeAnnotation.typeAnnotation.type !== 'VoidTypeAnnotation'
        ? ', value'
        : ''
    });
  }`;
}

function MethodTemplate(
  config: $ReadOnly<{
    abstract: boolean,
    methodBody: ?string,
    methodJavaAnnotation: string,
    methodName: string,
    translatedReturnType: string,
    traversedArgs: Array<string>,
  }>,
): string {
  const {
    abstract,
    methodBody,
    methodJavaAnnotation,
    methodName,
    translatedReturnType,
    traversedArgs,
  } = config;
  const methodQualifier = abstract ? 'abstract ' : '';
  const methodClosing = abstract
    ? ';'
    : methodBody != null && methodBody.length > 0
      ? ` { ${methodBody} }`
      : ' {}';
  return `  ${methodJavaAnnotation}
  public ${methodQualifier}${translatedReturnType} ${methodName}(${traversedArgs.join(
    ', ',
  )})${methodClosing}`;
}

type Param = NamedShape<Nullable<NativeModuleParamTypeAnnotation>>;

function translateEventEmitterTypeToJavaType(
  eventEmitter: NativeModuleEventEmitterShape,
  imports: Set<string>,
): string {
  const type = eventEmitter.typeAnnotation.typeAnnotation.type;
  switch (type) {
    case 'StringTypeAnnotation':
      return 'String';
    case 'StringLiteralTypeAnnotation':
      return 'String';
    case 'StringLiteralUnionTypeAnnotation':
      return 'String';
    case 'NumberTypeAnnotation':
    case 'NumberLiteralTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'DoubleTypeAnnotation':
    case 'Int32TypeAnnotation':
      return 'double';
    case 'BooleanTypeAnnotation':
      return 'boolean';
    case 'GenericObjectTypeAnnotation':
    case 'ObjectTypeAnnotation':
    case 'TypeAliasTypeAnnotation':
      imports.add('com.facebook.react.bridge.ReadableMap');
      return 'ReadableMap';
    case 'ArrayTypeAnnotation':
      imports.add('com.facebook.react.bridge.ReadableArray');
      return 'ReadableArray';
    case 'DoubleTypeAnnotation':
    case 'FloatTypeAnnotation':
    case 'Int32TypeAnnotation':
    case 'VoidTypeAnnotation':
      // TODO: Add support for these types
      throw new Error(
        `Unsupported eventType for ${eventEmitter.name}. Found: ${eventEmitter.typeAnnotation.typeAnnotation.type}`,
      );
    default:
      (type: empty);
      throw new Error(
        `Unsupported eventType for ${eventEmitter.name}. Found: ${eventEmitter.typeAnnotation.typeAnnotation.type}`,
      );
  }
}

function translateFunctionParamToJavaType(
  param: Param,
  createErrorMessage: (typeName: string) => string,
  resolveAlias: AliasResolver,
  imports: Set<string>,
): string {
  const {optional, typeAnnotation: nullableTypeAnnotation} = param;
  const [typeAnnotation, nullable] =
    unwrapNullable<NativeModuleParamTypeAnnotation>(nullableTypeAnnotation);
  const isRequired = !optional && !nullable;
  if (!isRequired) {
    imports.add('javax.annotation.Nullable');
  }

  // FIXME: support class alias for args
  let realTypeAnnotation = typeAnnotation;
  if (realTypeAnnotation.type === 'TypeAliasTypeAnnotation') {
    realTypeAnnotation = resolveAlias(realTypeAnnotation.name);
  }

  switch (realTypeAnnotation.type) {
    case 'ReservedTypeAnnotation':
      switch (realTypeAnnotation.name) {
        case 'RootTag':
          return wrapOptional('double', isRequired);
        default:
          (realTypeAnnotation.name: empty);
          throw new Error(createErrorMessage(realTypeAnnotation.name));
      }
    case 'StringTypeAnnotation':
      return wrapOptional('String', isRequired);
    case 'StringLiteralTypeAnnotation':
      return wrapOptional('String', isRequired);
    case 'StringLiteralUnionTypeAnnotation':
      return wrapOptional('String', isRequired);
    case 'NumberTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'NumberLiteralTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'FloatTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'DoubleTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'Int32TypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'BooleanTypeAnnotation':
      return wrapOptional('boolean', isRequired);
    case 'EnumDeclaration':
      switch (realTypeAnnotation.memberType) {
        case 'NumberTypeAnnotation':
          return wrapOptional('double', isRequired);
        case 'StringTypeAnnotation':
          return wrapOptional('String', isRequired);
        default:
          throw new Error(createErrorMessage(realTypeAnnotation.type));
      }
    case 'UnionTypeAnnotation':
      switch (typeAnnotation.memberType) {
        case 'NumberTypeAnnotation':
          return wrapOptional('double', isRequired);
        case 'ObjectTypeAnnotation':
          imports.add('com.facebook.react.bridge.ReadableMap');
          return wrapOptional('ReadableMap', isRequired);
        case 'StringTypeAnnotation':
          return wrapOptional('String', isRequired);
        default:
          throw new Error(
            `Unsupported union member returning value, found: ${realTypeAnnotation.memberType}"`,
          );
      }
    case 'ObjectTypeAnnotation':
      imports.add('com.facebook.react.bridge.ReadableMap');
      return wrapOptional('ReadableMap', isRequired);
    case 'GenericObjectTypeAnnotation':
      // Treat this the same as ObjectTypeAnnotation for now.
      imports.add('com.facebook.react.bridge.ReadableMap');
      return wrapOptional('ReadableMap', isRequired);
    case 'ArrayTypeAnnotation':
      imports.add('com.facebook.react.bridge.ReadableArray');
      return wrapOptional('ReadableArray', isRequired);
    case 'FunctionTypeAnnotation':
      imports.add('com.facebook.react.bridge.Callback');
      return wrapOptional('Callback', isRequired);
    default:
      (realTypeAnnotation.type: 'MixedTypeAnnotation');
      throw new Error(createErrorMessage(realTypeAnnotation.type));
  }
}

function translateFunctionReturnTypeToJavaType(
  nullableReturnTypeAnnotation: Nullable<NativeModuleReturnTypeAnnotation>,
  createErrorMessage: (typeName: string) => string,
  resolveAlias: AliasResolver,
  imports: Set<string>,
): string {
  const [returnTypeAnnotation, nullable] =
    unwrapNullable<NativeModuleReturnTypeAnnotation>(
      nullableReturnTypeAnnotation,
    );

  if (nullable) {
    imports.add('javax.annotation.Nullable');
  }

  const isRequired = !nullable;

  // FIXME: support class alias for args
  let realTypeAnnotation = returnTypeAnnotation;
  if (realTypeAnnotation.type === 'TypeAliasTypeAnnotation') {
    realTypeAnnotation = resolveAlias(realTypeAnnotation.name);
  }

  switch (realTypeAnnotation.type) {
    case 'ReservedTypeAnnotation':
      switch (realTypeAnnotation.name) {
        case 'RootTag':
          return wrapOptional('double', isRequired);
        default:
          (realTypeAnnotation.name: empty);
          throw new Error(createErrorMessage(realTypeAnnotation.name));
      }
    case 'VoidTypeAnnotation':
      return 'void';
    case 'PromiseTypeAnnotation':
      return 'void';
    case 'StringTypeAnnotation':
      return wrapOptional('String', isRequired);
    case 'StringLiteralTypeAnnotation':
      return wrapOptional('String', isRequired);
    case 'StringLiteralUnionTypeAnnotation':
      return wrapOptional('String', isRequired);
    case 'NumberTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'NumberLiteralTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'FloatTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'DoubleTypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'Int32TypeAnnotation':
      return wrapOptional('double', isRequired);
    case 'BooleanTypeAnnotation':
      return wrapOptional('boolean', isRequired);
    case 'EnumDeclaration':
      switch (realTypeAnnotation.memberType) {
        case 'NumberTypeAnnotation':
          return wrapOptional('double', isRequired);
        case 'StringTypeAnnotation':
          return wrapOptional('String', isRequired);
        default:
          throw new Error(createErrorMessage(realTypeAnnotation.type));
      }
    case 'UnionTypeAnnotation':
      switch (realTypeAnnotation.memberType) {
        case 'NumberTypeAnnotation':
          return wrapOptional('double', isRequired);
        case 'ObjectTypeAnnotation':
          imports.add('com.facebook.react.bridge.WritableMap');
          return wrapOptional('WritableMap', isRequired);
        case 'StringTypeAnnotation':
          return wrapOptional('String', isRequired);
        default:
          throw new Error(
            `Unsupported union member returning value, found: ${realTypeAnnotation.memberType}"`,
          );
      }
    case 'ObjectTypeAnnotation':
      imports.add('com.facebook.react.bridge.WritableMap');
      return wrapOptional('WritableMap', isRequired);
    case 'GenericObjectTypeAnnotation':
      imports.add('com.facebook.react.bridge.WritableMap');
      return wrapOptional('WritableMap', isRequired);
    case 'ArrayTypeAnnotation':
      imports.add('com.facebook.react.bridge.WritableArray');
      return wrapOptional('WritableArray', isRequired);
    default:
      (realTypeAnnotation.type: 'MixedTypeAnnotation');
      throw new Error(createErrorMessage(realTypeAnnotation.type));
  }
}

function getFalsyReturnStatementFromReturnType(
  nullableReturnTypeAnnotation: Nullable<NativeModuleReturnTypeAnnotation>,
  createErrorMessage: (typeName: string) => string,
  resolveAlias: AliasResolver,
): string {
  const [returnTypeAnnotation, nullable] =
    unwrapNullable<NativeModuleReturnTypeAnnotation>(
      nullableReturnTypeAnnotation,
    );

  let realTypeAnnotation = returnTypeAnnotation;
  if (realTypeAnnotation.type === 'TypeAliasTypeAnnotation') {
    realTypeAnnotation = resolveAlias(realTypeAnnotation.name);
  }

  switch (realTypeAnnotation.type) {
    case 'ReservedTypeAnnotation':
      switch (realTypeAnnotation.name) {
        case 'RootTag':
          return 'return 0.0;';
        default:
          (realTypeAnnotation.name: empty);
          throw new Error(createErrorMessage(realTypeAnnotation.name));
      }
    case 'VoidTypeAnnotation':
      return '';
    case 'PromiseTypeAnnotation':
      return '';
    case 'NumberTypeAnnotation':
      return nullable ? 'return null;' : 'return 0;';
    case 'NumberLiteralTypeAnnotation':
      return nullable ? 'return null;' : 'return 0;';
    case 'FloatTypeAnnotation':
      return nullable ? 'return null;' : 'return 0.0;';
    case 'DoubleTypeAnnotation':
      return nullable ? 'return null;' : 'return 0.0;';
    case 'Int32TypeAnnotation':
      return nullable ? 'return null;' : 'return 0;';
    case 'BooleanTypeAnnotation':
      return nullable ? 'return null;' : 'return false;';
    case 'EnumDeclaration':
      switch (realTypeAnnotation.memberType) {
        case 'NumberTypeAnnotation':
          return nullable ? 'return null;' : 'return 0;';
        case 'StringTypeAnnotation':
          return nullable ? 'return null;' : 'return "";';
        default:
          throw new Error(createErrorMessage(realTypeAnnotation.type));
      }
    case 'UnionTypeAnnotation':
      switch (realTypeAnnotation.memberType) {
        case 'NumberTypeAnnotation':
          return nullable ? 'return null;' : 'return 0;';
        case 'ObjectTypeAnnotation':
          return 'return null;';
        case 'StringTypeAnnotation':
          return nullable ? 'return null;' : 'return "";';
        default:
          throw new Error(
            `Unsupported union member returning value, found: ${realTypeAnnotation.memberType}"`,
          );
      }
    case 'StringTypeAnnotation':
      return nullable ? 'return null;' : 'return "";';
    case 'StringLiteralTypeAnnotation':
      return nullable ? 'return null;' : 'return "";';
    case 'StringLiteralUnionTypeAnnotation':
      return nullable ? 'return null;' : 'return "";';
    case 'ObjectTypeAnnotation':
      return 'return null;';
    case 'GenericObjectTypeAnnotation':
      return 'return null;';
    case 'ArrayTypeAnnotation':
      return 'return null;';
    default:
      (realTypeAnnotation.type: 'MixedTypeAnnotation');
      throw new Error(createErrorMessage(realTypeAnnotation.type));
  }
}

// Build special-cased runtime check for getConstants().
function buildGetConstantsMethod(
  method: NativeModulePropertyShape,
  imports: Set<string>,
  resolveAlias: AliasResolver,
): string {
  const [methodTypeAnnotation] =
    unwrapNullable<NativeModuleFunctionTypeAnnotation>(method.typeAnnotation);
  let returnTypeAnnotation = methodTypeAnnotation.returnTypeAnnotation;
  if (returnTypeAnnotation.type === 'TypeAliasTypeAnnotation') {
    // The return type is an alias, resolve it to get the expected undelying object literal type
    returnTypeAnnotation = resolveAlias(returnTypeAnnotation.name);
  }

  if (returnTypeAnnotation.type === 'ObjectTypeAnnotation') {
    const requiredProps = [];
    const optionalProps = [];
    const rawProperties = returnTypeAnnotation.properties || [];
    rawProperties.forEach(p => {
      if (p.optional || p.typeAnnotation.type === 'NullableTypeAnnotation') {
        optionalProps.push(p.name);
      } else {
        requiredProps.push(p.name);
      }
    });
    if (requiredProps.length === 0 && optionalProps.length === 0) {
      // Nothing to validate during runtime.
      return '';
    }

    imports.add('com.facebook.react.common.build.ReactBuildConfig');
    imports.add('java.util.Arrays');
    imports.add('java.util.HashSet');
    imports.add('java.util.Map');
    imports.add('java.util.Set');
    imports.add('javax.annotation.Nullable');

    const requiredPropsFragment =
      requiredProps.length > 0
        ? `Arrays.asList(
          ${requiredProps
            .sort()
            .map(p => `"${p}"`)
            .join(',\n          ')}
      )`
        : '';
    const optionalPropsFragment =
      optionalProps.length > 0
        ? `Arrays.asList(
          ${optionalProps
            .sort()
            .map(p => `"${p}"`)
            .join(',\n          ')}
      )`
        : '';

    return `  protected abstract Map<String, Object> getTypedExportedConstants();

  @Override
  @DoNotStrip
  public final @Nullable Map<String, Object> getConstants() {
    Map<String, Object> constants = getTypedExportedConstants();
    if (ReactBuildConfig.DEBUG || ReactBuildConfig.IS_INTERNAL_BUILD) {
      Set<String> obligatoryFlowConstants = new HashSet<>(${requiredPropsFragment});
      Set<String> optionalFlowConstants = new HashSet<>(${optionalPropsFragment});
      Set<String> undeclaredConstants = new HashSet<>(constants.keySet());
      undeclaredConstants.removeAll(obligatoryFlowConstants);
      undeclaredConstants.removeAll(optionalFlowConstants);
      if (!undeclaredConstants.isEmpty()) {
        throw new IllegalStateException(String.format("Native Module Flow doesn't declare constants: %s", undeclaredConstants));
      }
      undeclaredConstants = obligatoryFlowConstants;
      undeclaredConstants.removeAll(constants.keySet());
      if (!undeclaredConstants.isEmpty()) {
        throw new IllegalStateException(String.format("Native Module doesn't fill in constants: %s", undeclaredConstants));
      }
    }
    return constants;
  }`;
  }

  return '';
}

module.exports = {
  generate(
    libraryName: string,
    schema: SchemaType,
    packageName?: string,
    assumeNonnull: boolean = false,
    headerPrefix?: string,
  ): FilesOutput {
    const files = new Map<string, string>();
    const nativeModules = getModules(schema);

    const normalizedPackageName =
      packageName == null ? 'com.facebook.fbreact.specs' : packageName;
    const outputDir = `java/${normalizedPackageName.replace(/\./g, '/')}`;

    Object.keys(nativeModules).forEach(hasteModuleName => {
      const {aliasMap, excludedPlatforms, moduleName, spec} =
        nativeModules[hasteModuleName];
      if (excludedPlatforms != null && excludedPlatforms.includes('android')) {
        return;
      }
      const resolveAlias = createAliasResolver(aliasMap);
      const className = `${hasteModuleName}Spec`;

      const imports: Set<string> = new Set([
        // Always required.
        'com.facebook.react.bridge.ReactApplicationContext',
        'com.facebook.react.bridge.ReactContextBaseJavaModule',
        'com.facebook.react.bridge.ReactMethod',
        'com.facebook.react.turbomodule.core.interfaces.TurboModule',
        'com.facebook.proguard.annotations.DoNotStrip',
        'javax.annotation.Nonnull',
      ]);

      const methods = spec.methods.map(method => {
        if (method.name === 'getConstants') {
          return buildGetConstantsMethod(method, imports, resolveAlias);
        }

        const [methodTypeAnnotation] =
          unwrapNullable<NativeModuleFunctionTypeAnnotation>(
            method.typeAnnotation,
          );

        // Handle return type
        const translatedReturnType = translateFunctionReturnTypeToJavaType(
          methodTypeAnnotation.returnTypeAnnotation,
          typeName =>
            `Unsupported return type for method ${method.name}. Found: ${typeName}`,
          resolveAlias,
          imports,
        );
        const returningPromise =
          methodTypeAnnotation.returnTypeAnnotation.type ===
          'PromiseTypeAnnotation';
        const isSyncMethod =
          methodTypeAnnotation.returnTypeAnnotation.type !==
            'VoidTypeAnnotation' && !returningPromise;

        // Handle method args
        const traversedArgs = methodTypeAnnotation.params.map(param => {
          const translatedParam = translateFunctionParamToJavaType(
            param,
            typeName =>
              `Unsupported type for param "${param.name}" in ${method.name}. Found: ${typeName}`,
            resolveAlias,
            imports,
          );
          return `${translatedParam} ${param.name}`;
        });

        if (returningPromise) {
          // Promise return type requires an extra arg at the end.
          imports.add('com.facebook.react.bridge.Promise');
          traversedArgs.push('Promise promise');
        }

        const methodJavaAnnotation = `@ReactMethod${
          isSyncMethod ? '(isBlockingSynchronousMethod = true)' : ''
        }\n  @DoNotStrip`;
        const methodBody = method.optional
          ? getFalsyReturnStatementFromReturnType(
              methodTypeAnnotation.returnTypeAnnotation,
              typeName =>
                `Cannot build falsy return statement for return type for method ${method.name}. Found: ${typeName}`,
              resolveAlias,
            )
          : null;
        return MethodTemplate({
          abstract: !method.optional,
          methodBody,
          methodJavaAnnotation,
          methodName: method.name,
          translatedReturnType,
          traversedArgs,
        });
      });

      files.set(
        `${outputDir}/${className}.java`,
        FileTemplate({
          packageName: normalizedPackageName,
          className,
          jsName: moduleName,
          eventEmitters: spec.eventEmitters
            .map(eventEmitter => EventEmitterTemplate(eventEmitter, imports))
            .join('\n\n'),
          methods: methods.filter(Boolean).join('\n\n'),
          imports: Array.from(imports)
            .sort()
            .map(p => `import ${p};`)
            .join('\n'),
        }),
      );
    });

    return files;
  },
};
