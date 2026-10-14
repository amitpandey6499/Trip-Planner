import test from 'node:test';
import assert from 'node:assert/strict';
import { projectInfo, collegeLabel } from '../src/index.js';

test('projectInfo has the details every page relies on', () => {
  assert.ok(projectInfo.name);
  assert.ok(projectInfo.college.name);
  assert.ok(projectInfo.college.department);
  assert.ok(projectInfo.academicSession);
  assert.ok(Array.isArray(projectInfo.team) && projectInfo.team.length > 0);
  assert.ok(Array.isArray(projectInfo.techStack) && projectInfo.techStack.length > 0);
});

test('projectInfo cannot be mutated by accident', () => {
  assert.ok(Object.isFrozen(projectInfo));
  assert.ok(Object.isFrozen(projectInfo.college));
});

test('collegeLabel is built from projectInfo', () => {
  assert.equal(collegeLabel, `${projectInfo.college.name}, ${projectInfo.college.city}`);
  assert.ok(!collegeLabel.includes('Institute of Technology'), 'old wrong college name must not come back');
});
