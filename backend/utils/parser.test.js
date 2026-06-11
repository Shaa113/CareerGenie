const test = require('node:test');
const assert = require('node:assert/strict');

const { parseResumeText } = require('./parser');

test('parseResumeText handles C++ and C# skill tokens without throwing', () => {
  const result = parseResumeText('Experienced in C++ and C# with React and Node.js.');

  assert.ok(result.skills.includes('c++'));
  assert.ok(result.skills.includes('c#'));
  assert.ok(result.skills.includes('react'));
  assert.ok(result.skills.includes('node.js'));
});
