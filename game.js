const ELEMENTS = {
  H: { maxBonds: 1, color: "#f0f0f0", weight: 45 },
  O: { maxBonds: 2, color: "#ff5f5f", weight: 20 },
  C: { maxBonds: 4, color: "#777", weight: 20 },
  N: { maxBonds: 3, color: "#63a0ff", weight: 12 },
  Cl: { maxBonds: 1, color: "#6adb6a", weight: 2 },
  S: { maxBonds: 2, color: "#f6d65c", weight: 1 }
};

const rainZone = document.getElementById("rain-zone");
const tableZone = document.getElementById("table-zone");
const spawnBtn = document.getElementById("spawn-btn");
const clearBtn = document.getElementById("clear-btn");
const validationNode = document.getElementById("validation");
const messagesNode = document.getElementById("messages");
const scoreNode = document.getElementById("score");

let atomId = 0;
let atoms = new Map();
let bonds = [];
let selectedForBond = null;
let score = 0;

function weightedElement() {
  const entries = Object.entries(ELEMENTS);
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [symbol, cfg] of entries) {
    r -= cfg.weight;
    if (r <= 0) return symbol;
  }
  return "H";
}

function spawnAtom() {
  const symbol = weightedElement();
  const id = `a${atomId++}`;
  const atom = { id, symbol, zone: "rain", x: Math.random() * 260, y: 10 + Math.random() * 250 };
  atoms.set(id, atom);

  const node = document.createElement("div");
  node.className = "atom";
  node.id = id;
  node.textContent = symbol;
  node.style.left = `${atom.x}px`;
  node.style.top = `${atom.y}px`;
  node.style.background = ELEMENTS[symbol].color;

  node.draggable = true;
  node.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", id);
  });

  node.addEventListener("click", () => handleBondClick(id));
  rainZone.appendChild(node);
}

function handleBondClick(id) {
  const node = document.getElementById(id);
  if (!selectedForBond) {
    selectedForBond = id;
    node.classList.add("selected");
    return;
  }
  if (selectedForBond === id) return;

  const from = selectedForBond;
  document.getElementById(from)?.classList.remove("selected");
  selectedForBond = null;

  attemptBond(from, id);
}

function usedValence(id) {
  return bonds
    .filter((b) => b.a === id || b.b === id)
    .reduce((sum, b) => sum + b.order, 0);
}

function attemptBond(a, b) {
  const atomA = atoms.get(a);
  const atomB = atoms.get(b);
  if (!atomA || !atomB || atomA.zone !== "table" || atomB.zone !== "table") {
    pushMessage("Só podes ligar átomos que estejam na Mesa Molecular.");
    return;
  }

  if (bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))) {
    pushMessage("Ligação já existe entre estes átomos.");
    return;
  }

  const valA = usedValence(a);
  const valB = usedValence(b);
  if (valA >= ELEMENTS[atomA.symbol].maxBonds) return pushMessage(`${atomA.symbol} sem valência livre.`);
  if (valB >= ELEMENTS[atomB.symbol].maxBonds) return pushMessage(`${atomB.symbol} sem valência livre.`);

  bonds.push({ a, b, order: 1 });
  pushMessage(`Ligação válida criada: ${atomA.symbol}-${atomB.symbol}`);
  renderBonds();
  validateAndScore();
}

function renderBonds() {
  tableZone.querySelectorAll(".bond").forEach((n) => n.remove());
  for (const bond of bonds) {
    const a = document.getElementById(bond.a);
    const b = document.getElementById(bond.b);
    if (!a || !b) continue;

    const ax = a.offsetLeft + 22;
    const ay = a.offsetTop + 22;
    const bx = b.offsetLeft + 22;
    const by = b.offsetTop + 22;

    const length = Math.hypot(bx - ax, by - ay);
    const angle = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;

    const line = document.createElement("div");
    line.className = "bond";
    Object.assign(line.style, {
      position: "absolute", left: `${ax}px`, top: `${ay}px`, width: `${length}px`,
      height: "3px", background: "#b3d6ff", transformOrigin: "0 0", transform: `rotate(${angle}deg)`,
      pointerEvents: "none"
    });

    tableZone.appendChild(line);
  }
}

function validateAndScore() {
  const free = [...atoms.values()].filter((a) => a.zone === "table").reduce((acc, atom) => {
    const remaining = ELEMENTS[atom.symbol].maxBonds - usedValence(atom.id);
    return acc + Math.max(0, remaining);
  }, 0);

  if (free === 0 && bonds.length > 0) {
    validationNode.textContent = "Estrutura estável (protótipo)";
    score += 100 + bonds.length * 10;
  } else {
    validationNode.textContent = `Estrutura incompleta: ${free} ligações em falta`;
    score += Math.max(1, bonds.length);
  }

  scoreNode.textContent = String(score);
}

function pushMessage(msg) {
  const li = document.createElement("li");
  li.textContent = msg;
  messagesNode.prepend(li);
  while (messagesNode.children.length > 6) messagesNode.removeChild(messagesNode.lastChild);
}

function setupDrops(zone, zoneName) {
  zone.addEventListener("dragover", (e) => e.preventDefault());
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const node = document.getElementById(id);
    const atom = atoms.get(id);
    if (!node || !atom) return;

    const rect = zone.getBoundingClientRect();
    atom.x = e.clientX - rect.left - 22;
    atom.y = e.clientY - rect.top - 22;
    atom.zone = zoneName;

    node.style.left = `${Math.max(0, Math.min(rect.width - 44, atom.x))}px`;
    node.style.top = `${Math.max(0, Math.min(rect.height - 44, atom.y))}px`;
    zone.appendChild(node);
    renderBonds();
  });
}

clearBtn.addEventListener("click", () => {
  atoms.clear();
  bonds = [];
  tableZone.innerHTML = "";
  rainZone.innerHTML = "";
  validationNode.textContent = "—";
  messagesNode.innerHTML = "";
  score = 0;
  scoreNode.textContent = "0";
});

spawnBtn.addEventListener("click", spawnAtom);
setupDrops(rainZone, "rain");
setupDrops(tableZone, "table");

setInterval(spawnAtom, 2500);
for (let i = 0; i < 5; i++) spawnAtom();
