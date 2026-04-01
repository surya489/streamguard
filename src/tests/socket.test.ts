import assert from "assert";
import test from "node:test";

import { userRoom } from "../sockets/socket";

test("userRoom creates stable room key", () => {
  assert.equal(userRoom("abc123"), "user:abc123");
  assert.equal(userRoom("42"), "user:42");
});
