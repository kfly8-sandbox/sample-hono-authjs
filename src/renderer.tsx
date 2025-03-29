import { reactRenderer } from '@hono/react-renderer'

export const renderer = reactRenderer(({ children }) => {
  return (
    <html>
      <head>
        { !!import.meta.env ? (
          <link href="/src/style.css" rel="stylesheet" />
        ) : (
          <link href="/static/style.css" rel="stylesheet" />
        ) }
      </head>
      <body>{children}</body>
    </html>
  )
})
