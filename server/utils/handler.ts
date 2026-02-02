import type { EventHandler, EventHandlerRequest } from 'h3'

type ValidationRule = (body: any) => void

export function defineValidatedHandler(
  validateBody: ValidationRule,
  handler: EventHandler
): EventHandler {
  return defineEventHandler(async (event) => {
    try {
      const body = await readBody(event).catch(() => ({}))
      validateBody(body)

      return await handler(event)
    } catch (err) {
      throw err
    }
  })
}

type ValidationRuleWithParams = (params: any) => void

export function defineValidatedParamsHandler(
  validateParams: ValidationRuleWithParams,
  handler: EventHandler
): EventHandler {
  return defineEventHandler(async (event) => {
    try {
      const params = getRouterParams(event)
      validateParams(params)

      return await handler(event)
    } catch (err) {
      throw err
    }
  })
}
