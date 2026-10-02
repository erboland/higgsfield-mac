import assert from 'node:assert/strict'
import test from 'node:test'
import { demoAsset } from '../src/shared/demoAsset.ts'

test('demo files use a relative path in the browser and a media URL in the packaged app', () => {
  assert.equal(demoAsset('still.jpg', { dev: true, electron: false, base: './' }), './demos/still.jpg')
  assert.equal(demoAsset('cinema-clip.mp4', { dev: false, electron: true, base: './' }), 'media://app/demos/cinema-clip.mp4')
  assert.equal(demoAsset('../secret.png', { dev: true, electron: false, base: '/' }), '/demos/secret.png')
  assert.equal(demoAsset('notes.txt', { dev: true, electron: false, base: '/' }), '')
})
