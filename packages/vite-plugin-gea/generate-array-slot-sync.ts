/**
 * Generate __syncArraySlot_X for unresolved maps with component children.
 * Creates component instances with full props (including functions) instead of serializing to HTML.
 */
import * as t from '@babel/types'
import { id, jsBlockBody, jsExpr, jsMethod } from 'eszter'
import type { NodePath } from '@babel/traverse'
import type { UnresolvedMapInfo } from './ir.ts'
import { ITEM_IS_KEY } from './analyze-helpers.ts'
import { buildComponentPropsExpression, collectTemplateSetupStatements } from './transform-attributes.ts'
import type { TemplateSetupContext } from './transform-attributes.ts'
import { transformJSXExpression, transformJSXFragmentToTemplate } from './transform-jsx.ts'
import { getJSXTagName, isComponentTag, pruneUnusedSetupDestructuring } from './utils.ts'
import { replacePropRefsInExpression, replacePropRefsInStatements } from './utils.ts'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const traverse = require('@babel/traverse').default

export function isUnresolvedMapWithComponentChild(
  um: UnresolvedMapInfo,
  imports: Map<string, string>,
): { componentTag: string } | null {
  const template = um.itemTemplate
  if (!template) return null
  const root = t.isJSXElement(template) ? template : t.isJSXFragment(template) ? null : null
  if (!root || !t.isJSXElement(root)) return null
  const tagName = getJSXTagName(root.openingElement.name)
  if (!tagName || !isComponentTag(tagName) || !imports.has(tagName)) return null
  return { componentTag: tagName }
}

function getArrayCapName(arrayPropName: string): string {
  return arrayPropName.charAt(0).toUpperCase() + arrayPropName.slice(1)
}

export function getComponentArrayItemsName(arrayPropName: string): string {
  return `_${arrayPropName}Items`
}

export function getComponentArrayBuildMethodName(arrayPropName: string): string {
  return `_build${getArrayCapName(arrayPropName)}Items`
}

export function getComponentArrayRefreshMethodName(arrayPropName: string): string {
  return `__refresh${getArrayCapName(arrayPropName)}Items`
}

export function generateComponentArrayMethods(
  um: UnresolvedMapInfo,
  arrayPropName: string,
  imports: Map<string, string>,
  propNames: Set<string>,
  _classBody: t.ClassBody,
  storeArrayAccess?: { storeVar: string; propName: string },
  wholeParamName?: string,
  templateSetupContext?: TemplateSetupContext,
): t.ClassMethod[] {
  const comp = isUnresolvedMapWithComponentChild(um, imports)
  if (!comp) return []

  const itemTemplate = um.itemTemplate
  if (!itemTemplate || !t.isJSXElement(itemTemplate)) return []

  const mapJsxCtx = {
    imports,
    componentInstances: new Map(),
    componentInstanceCursors: new Map(),
    inMapCallback: true,
    isRoot: false,
  }
  const transformExpr = (expr: t.Expression) => {
    const replaced = replacePropRefsInExpression(expr, propNames, wholeParamName)
    return transformJSXExpression(replaced, mapJsxCtx)
  }
  const transformFrag = (frag: t.JSXFragment) => transformJSXFragmentToTemplate(frag, mapJsxCtx)

  const propsResult = buildComponentPropsExpression(
    itemTemplate,
    imports,
    new Map(),
    undefined,
    undefined,
    templateSetupContext,
    transformExpr,
    transformFrag,
  )

  const propsExpr = propsResult.expression
  const itemVar = um.itemVariable
  const needsRename = itemVar !== 'opt'
  let finalPropsExpr: t.ObjectExpression = propsExpr
  if (needsRename) {
    const cloned = t.cloneNode(propsExpr, true) as t.ObjectExpression
    traverse(cloned, {
      noScope: true,
      Identifier(path: NodePath<t.Identifier>) {
        if (path.node.name !== itemVar) return
        const parentNode = path.parentPath?.node
        if (parentNode && t.isObjectProperty(parentNode) && parentNode.key === path.node && !parentNode.computed) {
          return
        }
        path.node.name = 'opt'
      },
      MemberExpression(path: NodePath<t.MemberExpression>) {
        if (t.isIdentifier(path.node.object) && path.node.object.name === itemVar) {
          path.node.object = t.identifier('opt')
        }
      },
    })
    finalPropsExpr = cloned
  }

  const itemsName = getComponentArrayItemsName(arrayPropName)
  const buildMethodName = getComponentArrayBuildMethodName(arrayPropName)
  const refreshMethodName = getComponentArrayRefreshMethodName(arrayPropName)
  const mountMethodName = `__mount${getArrayCapName(arrayPropName)}Items`
  const containerName = `__${arrayPropName}ItemsContainer`
  const containerLookupExpr = um.containerBindingId
    ? t.callExpression(t.memberExpression(t.identifier('document'), t.identifier('getElementById')), [
        t.binaryExpression(
          '+',
          t.memberExpression(t.thisExpression(), t.identifier('id')),
          t.stringLiteral(`-${um.containerBindingId}`),
        ),
      ])
    : (jsExpr`this.$(":scope")` as t.Expression)

  let arrAccessExpr: t.Expression
  let arrSetupStatements: t.Statement[] = []
  if (storeArrayAccess) {
    arrAccessExpr = t.memberExpression(t.identifier(storeArrayAccess.storeVar), t.identifier(storeArrayAccess.propName))
  } else if (um.computationExpr) {
    arrSetupStatements = um.computationSetupStatements
      ? replacePropRefsInStatements(
          um.computationSetupStatements.map((stmt) => t.cloneNode(stmt, true) as t.Statement),
          propNames,
          wholeParamName,
        )
      : []
    arrAccessExpr = replacePropRefsInExpression(t.cloneNode(um.computationExpr, true), propNames, wholeParamName)
  } else {
    arrAccessExpr = t.memberExpression(
      t.memberExpression(t.thisExpression(), t.identifier('props')),
      t.identifier(arrayPropName),
    )
  }

  arrSetupStatements = pruneUnusedSetupDestructuring(arrSetupStatements, [arrAccessExpr, finalPropsExpr])

  const itemPropsMethodName = `__itemProps_${arrayPropName}`
  const itemPropsCall = t.callExpression(t.memberExpression(t.thisExpression(), t.identifier(itemPropsMethodName)), [
    t.identifier('opt'),
  ])

  const itemPropsSetup = collectTemplateSetupStatements(finalPropsExpr, templateSetupContext)
  const itemPropsMethod = jsMethod`${id(itemPropsMethodName)}(opt) {}`
  itemPropsMethod.body.body.push(...itemPropsSetup, t.returnStatement(finalPropsExpr))

  const itemIdProp = um.itemIdProperty
  const keyExpr: t.Expression =
    itemIdProp && itemIdProp !== ITEM_IS_KEY
      ? t.callExpression(t.identifier('String'), [t.memberExpression(t.identifier('opt'), t.identifier(itemIdProp))])
      : itemIdProp === ITEM_IS_KEY
        ? t.callExpression(t.identifier('String'), [t.identifier('opt')])
        : t.binaryExpression('+', t.stringLiteral('__idx_'), t.identifier('__k'))

  const buildMethod = jsMethod`${id(buildMethodName)}() {}`
  buildMethod.body.body.push(
    ...arrSetupStatements,
    ...(itemIdProp
      ? jsBlockBody`
           const arr = ${arrAccessExpr} ?? [];
           this.${id(itemsName)} = arr.map((opt, __k) => {
             const item = new ${id(comp.componentTag)}(${t.cloneNode(itemPropsCall, true)});
             item.parentComponent = this;
             item.__geaCompiledChild = true;
             item.__geaItemKey = ${t.cloneNode(keyExpr, true)};
             return item;
           });
         `
      : jsBlockBody`
           const arr = ${arrAccessExpr} ?? [];
           this.${id(itemsName)} = arr.map(opt => {
             const item = new ${id(comp.componentTag)}(${t.cloneNode(itemPropsCall, true)});
             item.parentComponent = this;
             item.__geaCompiledChild = true;
             return item;
           });
         `),
  )

  const mountMethod = jsMethod`${id(mountMethodName)}() {}`
  mountMethod.body.body.push(
    ...jsBlockBody`
      if (!this.${id(containerName)}) {
        this.${id(containerName)} = ${containerLookupExpr};
      }
      if (!this.${id(containerName)}) return;
      this.${id(containerName)}.textContent = '';
      for (let i = 0; i < (this.${id(itemsName)}?.length ?? 0); i++) {
        const item = this.${id(itemsName)}[i];
        if (!item) continue;
        if (!this.__childComponents.includes(item)) {
          this.__childComponents.push(item);
        }
        item.render(this.${id(containerName)}, i);
      }
    `,
  )

  const refreshMethod = jsMethod`${id(refreshMethodName)}() {}`
  if (itemIdProp) {
    refreshMethod.body.body.push(
      ...arrSetupStatements.map((stmt) => t.cloneNode(stmt, true) as t.Statement),
      ...jsBlockBody`
         const arr = ${t.cloneNode(arrAccessExpr, true)} ?? [];
         const __old = this.${id(itemsName)} ?? [];
         const __keyMap = new Map();
         for (let __k = 0; __k < __old.length; __k++) {
           if (__old[__k].__geaItemKey != null) {
             __keyMap.set(__old[__k].__geaItemKey, __old[__k]);
           }
         }
         const __new = [];
         for (let __k = 0; __k < arr.length; __k++) {
           const opt = arr[__k];
           const __key = ${t.cloneNode(keyExpr, true)};
           const __existing = __keyMap.get(__key);
           if (__existing) {
             __existing.__geaUpdateProps(${t.cloneNode(itemPropsCall, true)});
             __new.push(__existing);
             __keyMap.delete(__key);
           } else {
             const __item = new ${id(comp.componentTag)}(${t.cloneNode(itemPropsCall, true)});
             __item.parentComponent = this;
             __item.__geaCompiledChild = true;
             __item.__geaItemKey = __key;
             __new.push(__item);
           }
         }
         for (const [, __removed] of __keyMap) {
           __removed.dispose?.();
         }
         if (!this.${id(containerName)} && this.rendered_) {
           this.${id(containerName)} = ${t.cloneNode(containerLookupExpr, true)};
         }
         const __container = this.${id(containerName)};
         if (__container && this.rendered_) {
           for (let __k = 0; __k < __new.length; __k++) {
             if (!__new[__k].rendered_) {
               if (!this.__childComponents.includes(__new[__k])) {
                 this.__childComponents.push(__new[__k]);
               }
               __new[__k].render(__container);
             }
           }
           for (let __k = 0; __k < __new.length; __k++) {
             const __el = __new[__k].element_;
             if (__el && __container.children[__k] !== __el) {
               __container.insertBefore(__el, __container.children[__k] || null);
             }
           }
         }
         this.${id(itemsName)} = __new;
         this.__childComponents = (this.__childComponents || []).filter(
           child => !__old.includes(child) || __new.includes(child)
         );
       `,
    )
  } else {
    refreshMethod.body.body.push(
      ...arrSetupStatements.map((stmt) => t.cloneNode(stmt, true) as t.Statement),
      ...jsBlockBody`
         const arr = ${t.cloneNode(arrAccessExpr, true)} ?? [];
         const __old = this.${id(itemsName)} ?? [];
         const __oldLen = __old.length;
         const __newLen = arr.length;
         if (__oldLen !== __newLen) {
           if (__newLen > __oldLen) {
             for (let __k = 0; __k < __oldLen; __k++) {
               const opt = arr[__k];
               __old[__k].__geaUpdateProps(${t.cloneNode(itemPropsCall, true)});
             }
             if (!this.${id(containerName)} && this.rendered_) {
               this.${id(containerName)} = ${t.cloneNode(containerLookupExpr, true)};
             }
             for (let __k = __oldLen; __k < __newLen; __k++) {
               const opt = arr[__k];
               const __item = new ${id(comp.componentTag)}(${t.cloneNode(itemPropsCall, true)});
               __item.parentComponent = this;
               __item.__geaCompiledChild = true;
               this.${id(itemsName)}.push(__item);
               if (!this.__childComponents.includes(__item)) {
                 this.__childComponents.push(__item);
               }
               if (this.rendered_ && this.${id(containerName)}) {
                 __item.render(this.${id(containerName)}, __k);
               }
             }
             return;
           }
           if (__newLen < __oldLen) {
             for (let __k = __newLen; __k < __oldLen; __k++) {
               __old[__k]?.dispose?.();
             }
             this.${id(itemsName)}.length = __newLen;
             this.__childComponents = (this.__childComponents || []).filter(
               child => !__old.slice(__newLen).includes(child)
             );
             for (let __k = 0; __k < __newLen; __k++) {
               const opt = arr[__k];
               this.${id(itemsName)}[__k].__geaUpdateProps(${t.cloneNode(itemPropsCall, true)});
             }
             return;
           }
         }
         for (let i = 0; i < arr.length; i++) {
           const opt = arr[i];
           this.${id(itemsName)}[i].__geaUpdateProps(${t.cloneNode(itemPropsCall, true)});
         }
       `,
    )
  }

  return [itemPropsMethod, buildMethod, mountMethod, refreshMethod]
}
