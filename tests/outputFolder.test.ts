import assert from 'node:assert/strict'
import { test } from 'node:test'
import { picturesFolder, usableFolder } from '../src/shared/outputFolder.ts'

test('the output folder is Pictures/Higgsfield and never the filesystem root', () => {
  assert.equal(picturesFolder('/Users/ada'), '/Users/ada/Pictures/Higgsfield')
  assert.equal(usableFolder('/', '/Users/ada'), '/Users/ada/Pictures/Higgsfield')
  assert.equal(usableFolder('   ', '/Users/ada'), '/Users/ada/Pictures/Higgsfield')
  assert.equal(usableFolder('/Users/ada/Desktop', '/Users/ada'), '/Users/ada/Desktop')
  assert.throws(() => picturesFolder('/'), /Could not choose an output folder/)
})
