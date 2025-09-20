// Vitest setup file
import { beforeAll, afterAll } from 'vitest'

beforeAll(() => {
  // Setup code before tests run
  process.env.NODE_ENV = 'test'
})

afterAll(() => {
  // Cleanup after tests
})