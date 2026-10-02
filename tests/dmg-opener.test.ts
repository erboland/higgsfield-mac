import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

function assertSystemXattr(text: string) {
  assert.match(text, /\/usr\/bin\/xattr -cr /)
  assert.doesNotMatch(text, /(?<!\/usr\/bin\/)xattr\s+-/)
}

test('the disk image opener and the README call /usr/bin/xattr -cr', () => {
  const opener = readFileSync('scripts/open-higgsfield.command', 'utf8')
  const readme = readFileSync('README.md', 'utf8')
  assertSystemXattr(opener)
  assertSystemXattr(readme)
  assert.match(opener, /^#!\/bin\/bash\n/)
  assert.match(opener, /\/usr\/bin\/ditto /)
  assert.match(opener, /\/usr\/bin\/open /)
  assert.match(readme, /not notarized/)
  assert.doesNotMatch(readme, /is notarized/)
})
