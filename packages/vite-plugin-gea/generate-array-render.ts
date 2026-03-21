import * as t from '@babel/types'
import { appendToBody, id, js, jsMethod } from 'eszter'
import type { ArrayMapBinding, EventHandler, HandlerPropInMap } from './ir.ts'
import { transformJSXToTemplate, transformJSXFragmentToTemplate } from './transform-jsx.ts'
import {
  normalizePathParts,
  pathPartsToString,
  replacePropRefsInExpression,
  replacePropRefsInStatements,
} from './utils.ts'
import { ITEM_IS_KEY } from './analyze-helpers.ts'
import { collectTemplateSetupStatements } from './transform-attributes.ts'
import type { TemplateSetupContext } from './transform-attributes.ts'

function buildHandlerRegistrationStatements(
  handlerProps: HandlerPropInMap[],
  itemVariable: string,
  propNames: Set<string>,
  wholeParamName?: string,
): t.Statement[] {
  if (handlerProps.length === 0) return []
  const stmts: t.Statement[] = [
    t.ifStatement(
      t.unaryExpression('!', t.memberExpression(t.thisExpression(), t.identifier('__itemHandlers_'))),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(t.thisExpression(), t.identifier('__itemHandlers_')),
          t.objectExpression([]),
        ),
      ),
    ),
  ]
  for (const hp of handlerProps) {
    const handlerClone = t.cloneNode(hp.handlerExpression, true) as t.ArrowFunctionExpression
    const handlerExpr = handlerClone
    const body = t.isBlockStatement(handlerExpr.body)
      ? handlerExpr.body.body
      : [t.expressionStatement(handlerExpr.body)]
    const bodyWithProps = replacePropRefsInStatements(body, propNames, wholeParamName)
    const fn =
      bodyWithProps.length === 1 && t.isExpressionStatement(bodyWithProps[0]) && !t.isBlockStatement(handlerExpr.body)
        ? t.arrowFunctionExpression([t.identifier('e')], (bodyWithProps[0] as t.ExpressionStatement).expression)
        : t.arrowFunctionExpression([t.identifier('e')], t.blockStatement(bodyWithProps))
    const keyExpr =
      hp.itemIdProperty && hp.itemIdProperty !== ITEM_IS_KEY
        ? t.memberExpression(t.identifier(itemVariable), t.identifier(hp.itemIdProperty))
        : t.callExpression(t.identifier('String'), [t.identifier(itemVariable)])
    stmts.push(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('__itemHandlers_')), keyExpr, true),
          fn,
        ),
      ),
    )
  }
  return stmts
}

/** Build a method that populates __itemHandlers_ from an array. Used when the template
 *  uses the map inline (unresolved maps) so the render method's registration never runs. */
export function buildPopulateItemHandlersMethod(
  arrayPropName: string,
  handlerProps: HandlerPropInMap[],
  propNames: Set<string>,
  wholeParamName?: string,
): t.ClassMethod | null {
  if (handlerProps.length === 0) return null
  const loopBody: t.Statement[] = []
  for (const hp of handlerProps) {
    const handlerClone = t.cloneNode(hp.handlerExpression, true) as t.ArrowFunctionExpression
    const handlerExpr = handlerClone
    const stmtBody = t.isBlockStatement(handlerExpr.body)
      ? handlerExpr.body.body
      : [t.expressionStatement(handlerExpr.body)]
    const bodyWithProps = replacePropRefsInStatements(stmtBody, propNames, wholeParamName)
    const fn =
      bodyWithProps.length === 1 && t.isExpressionStatement(bodyWithProps[0]) && !t.isBlockStatement(handlerExpr.body)
        ? t.arrowFunctionExpression([t.identifier('e')], (bodyWithProps[0] as t.ExpressionStatement).expression)
        : t.arrowFunctionExpression([t.identifier('e')], t.blockStatement(bodyWithProps))
    const itemVar = 'item' // populate method uses generic loop var
    const keyExpr =
      hp.itemIdProperty && hp.itemIdProperty !== ITEM_IS_KEY
        ? t.memberExpression(t.identifier(itemVar), t.identifier(hp.itemIdProperty))
        : t.callExpression(t.identifier('String'), [t.identifier(itemVar)])
    loopBody.push(
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier('__itemHandlers_')), keyExpr, true),
          fn,
        ),
      ),
    )
  }
  const body: t.Statement[] = [
    t.ifStatement(
      t.unaryExpression('!', t.memberExpression(t.thisExpression(), t.identifier('__itemHandlers_'))),
      t.expressionStatement(
        t.assignmentExpression(
          '=',
          t.memberExpression(t.thisExpression(), t.identifier('__itemHandlers_')),
          t.objectExpression([]),
        ),
      ),
    ),
    t.ifStatement(t.unaryExpression('!', t.identifier('arr')), t.returnStatement()),
    t.forOfStatement(
      t.variableDeclaration('const', [t.variableDeclarator(t.identifier('item'), null)]),
      t.identifier('arr'),
      t.blockStatement(loopBody),
    ),
  ]
  return t.classMethod(
    'method',
    t.identifier(`__populateItemHandlersFor_${arrayPropName}`),
    [t.identifier('arr')],
    t.blockStatement(body),
  )
}

/**
 * The reactive proxy wraps primitive property accesses in binding objects.
 * This breaks === comparisons (two bindings wrapping the same value are
 * different objects). We inject a tiny helper and wrap comparison operands
 * so they're unwrapped before the comparison.
 */
function buildValueUnwrapHelper(): t.VariableDeclaration {
  return js`
    const __v = (v) =>
      v != null && typeof v === 'object'
        ? v.valueOf()
        : v;
  ` as t.VariableDeclaration
}

function unwrapComparisonOperands(node: t.Expression): t.Expression {
  if (t.isBinaryExpression(node) && ['===', '==', '!==', '!='].includes(node.operator)) {
    return t.binaryExpression(
      node.operator,
      t.callExpression(t.identifier('__v'), [unwrapComparisonOperands(node.left as t.Expression)]),
      t.callExpression(t.identifier('__v'), [unwrapComparisonOperands(node.right as t.Expression)]),
    )
  }
  if (t.isConditionalExpression(node)) {
    return t.conditionalExpression(
      unwrapComparisonOperands(node.test),
      unwrapComparisonOperands(node.consequent),
      unwrapComparisonOperands(node.alternate),
    )
  }
  if (t.isLogicalExpression(node)) {
    return t.logicalExpression(
      node.operator,
      unwrapComparisonOperands(node.left as t.Expression) as any,
      unwrapComparisonOperands(node.right as t.Expression),
    )
  }
  return node
}

export function generateRenderItemMethod(
  arrayMap: ArrayMapBinding,
  imports: Map<string, string>,
  eventHandlers?: EventHandler[],
  eventIdCounter?: { value: number },
  classBody?: t.ClassBody,
  templateSetupContext?: TemplateSetupContext,
): { method: t.ClassMethod | null; handlers: EventHandler[]; handlerPropsInMap: HandlerPropInMap[] } {
  const renderEventHandlers: EventHandler[] = []
  if (!arrayMap.itemTemplate) return { method: null, handlers: renderEventHandlers, handlerPropsInMap: [] }
  const arrayPath = pathPartsToString(arrayMap.arrayPathParts || normalizePathParts((arrayMap as any).arrayPath || ''))

  const modified = t.cloneNode(arrayMap.itemTemplate, true) as t.JSXElement | t.JSXFragment
  const handlerPropsInMap: HandlerPropInMap[] = []
  const ctx = {
    imports,
    eventHandlers: renderEventHandlers,
    eventIdCounter,
    inMapCallback: true,
    handlerPropsInMap,
    mapItemIdProperty: arrayMap.itemIdProperty || 'id',
    mapItemVariable: arrayMap.itemVariable,
    mapContainerBindingId: arrayMap.containerBindingId,
  }
  if (t.isJSXFragment(modified)) {
    const err = new Error(
      `[gea] Fragments as .map() item roots are not supported. Wrap the fragment children in a single root element (e.g., <div>...</div>).`,
    )
    ;(err as any).__geaCompileError = true
    throw err
  }
  const wrapped = transformJSXToTemplate(modified as t.JSXElement, ctx)

  const methodName = `render${arrayPath.charAt(0).toUpperCase() + arrayPath.slice(1).replace(/\./g, '')}Item`

  const propNames = new Set<string>()
  let wholeParam: string | undefined
  if (classBody) {
    const templateMethod = classBody.body.find(
      (m): m is t.ClassMethod => t.isClassMethod(m) && t.isIdentifier(m.key) && m.key.name === 'template',
    )
    if (templateMethod?.params[0] && t.isObjectPattern(templateMethod.params[0])) {
      templateMethod.params[0].properties.forEach((p) => {
        if (t.isObjectProperty(p) && t.isIdentifier(p.key)) propNames.add(p.key.name)
      })
    }
    if (templateMethod?.params[0] && t.isIdentifier(templateMethod.params[0])) {
      wholeParam = templateMethod.params[0].name
    }
  }

  wrapped.expressions = wrapped.expressions.map((expr) =>
    replacePropRefsInExpression(unwrapComparisonOperands(expr as t.Expression), propNames, wholeParam),
  )

  const handlerRegStmts = buildHandlerRegistrationStatements(
    handlerPropsInMap,
    arrayMap.itemVariable,
    propNames,
    wholeParam,
  )

  const callbackBodyStmts = arrayMap.callbackBodyStatements || []
  const setupScope =
    callbackBodyStmts.length > 0
      ? t.blockStatement([
          ...callbackBodyStmts.map((s) => t.cloneNode(s, true) as t.Statement),
          t.expressionStatement(wrapped),
        ])
      : wrapped
  const setupStmts = collectTemplateSetupStatements(setupScope, templateSetupContext)
  const rewrittenSetup = setupStmts
    .map((stmt) => replacePropRefsInStatements([t.cloneNode(stmt, true) as t.Statement], propNames, wholeParam))
    .flat()

  const rewrittenCallbackBody = callbackBodyStmts
    .map((stmt) => replacePropRefsInStatements([t.cloneNode(stmt, true) as t.Statement], propNames, wholeParam))
    .flat()

  const baseMethod = jsMethod`${id(methodName)}(${id(arrayMap.itemVariable)}) {}`
  if (arrayMap.indexVariable) {
    baseMethod.params.push(t.identifier(arrayMap.indexVariable))
  }
  const method = appendToBody(
    baseMethod,
    ...rewrittenSetup,
    buildValueUnwrapHelper(),
    ...rewrittenCallbackBody,
    ...handlerRegStmts,
    t.returnStatement(wrapped),
  )

  if (handlerPropsInMap.length > 0 && classBody) {
    const handleItemHandler = jsMethod`__handleItemHandler(itemId, e) {
    const fn = this.__itemHandlers_?.[itemId];
    if (fn) fn(e);
  }` as t.ClassMethod
    if (
      !classBody.body.some((m) => t.isClassMethod(m) && t.isIdentifier(m.key) && m.key.name === '__handleItemHandler')
    ) {
      classBody.body.unshift(handleItemHandler)
    }
  }

  renderEventHandlers.forEach((h) => {
    h.mapContext = {
      arrayPathParts: arrayMap.arrayPathParts || normalizePathParts((arrayMap as any).arrayPath || ''),
      itemIdProperty: arrayMap.itemIdProperty || 'id',
      itemVariable: arrayMap.itemVariable,
      isImportedState: arrayMap.isImportedState || false,
      storeVar: arrayMap.storeVar,
    }
  })

  if (eventHandlers) renderEventHandlers.forEach((h) => eventHandlers.push(h))
  return { method, handlers: renderEventHandlers, handlerPropsInMap }
}

