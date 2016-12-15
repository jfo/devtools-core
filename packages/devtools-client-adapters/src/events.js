const { createFrame, createSource } = require("./create");
const { isEnabled } = require("devtools-config");

const CALL_STACK_PAGE_SIZE = 1000;

let threadClient;
let actions;

function setupEvents(dependencies) {
  threadClient = dependencies.threadClient;
  actions = dependencies.actions;
}

async function paused(_, packet) {
  // If paused by an explicit interrupt, which are generated by the
  // slow script dialog and internal events such as setting
  // breakpoints, ignore the event.
  if (packet.why.type === "interrupted" && !packet.why.onNext) {
    return;
  }

  // Eagerly fetch the frames
  const response = await threadClient.getFrames(0, CALL_STACK_PAGE_SIZE);
  const frames = response.frames.map(createFrame);

  const pause = Object.assign({}, packet, {
    frame: createFrame(packet.frame),
    frames: frames
  });

  actions.paused(pause);
}

function resumed(_, packet) {
  actions.resumed(packet);
}

function newSource(_, { source }) {
  actions.newSource(createSource(source));

  if (isEnabled("eventListeners")) {
    actions.fetchEventListeners();
  }
}

const clientEvents = {
  paused,
  resumed,
  newSource
};

module.exports = {
  setupEvents,
  clientEvents
};
