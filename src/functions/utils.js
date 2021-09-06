const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
}

async function sleep(ms) {
    await _sleep(ms);
}

function _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {assert, sleep}
