import { Hono } from 'hono'
import { renderer } from './renderer'
import LoginBlock from "@/blocks/login"

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(
    <>
      <LoginBlock />
    </>
  )
})

export default app
