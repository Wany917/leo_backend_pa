import path from 'node:path'
import url from 'node:url'

export default {
  path: path.dirname(url.fileURLToPath(import.meta.url)) + '/../',

  title: 'EcoDeli API - Documentation Interactive',
  version: '1.0.0',
  description:
    'API complète pour la plateforme EcoDeli de livraison collaborative et services entre particuliers. Inclut géolocalisation temps réel, correspondances intelligentes et gestion multi-utilisateurs.',
  snakeCase: true,
  tagIndex: 2,
  ignore: ['/openapi', '/docs', '/scalar'],
  // If PUT/PATCH are provided for the same route, prefer PUT
  preferredPutPatch: 'PUT',
  common: {
    // OpenAPI conform parameters that are commonly used
    parameters: {},
    // OpenAPI conform headers that are commonly used
    headers: {
      Authorization: {
        name: 'Authorization',
        in: 'header',
        description: 'Bearer token pour authentification',
        required: false,
        schema: {
          type: 'string',
          example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  },
  persistAuthorization: true,
  showFullPath: false,
}
