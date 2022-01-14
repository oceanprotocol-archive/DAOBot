const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

async function sleep(ms) {
  await _sleep(ms)
}

function verifyEmail(email) {
  email = String(email).toLowerCase().trim()
  if (email.length === 0) {
    return false
  }
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

module.exports = { assert, sleep, verifyEmail }
