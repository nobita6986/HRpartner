// fake_neon_api.js -- Offline Neon API stub for testing neon_branch_gate.ps1
// and neon_branch_gate_prod.ps1.
//
// Scenarios:
//   --scenario pass-hrp-live   admin/writer endpoints map to hrp-live
//   --scenario pass-hrp-mp2    admin/writer endpoints map to hrp_mp2_test
//   --scenario refuse-name     admin/writer endpoints map to hrp_mp2_test,
//                              but gate's hardcoded expected is hrp-live
//                              (prod gate refuses by name)
//   --scenario wrong-branch    one endpoint maps to hrp-live, the other
//                              to hrp_mp2_test (simulates DATABASE_URL_ADMIN
//                              and DATABASE_URL disagreeing)

const http = require('http');

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return def;
}
const scenario = arg('--scenario', 'pass-hrp-live');
const port = parseInt(arg('--port', '4567'), 10);

// Endpoint IDs we mint. The two URLs in gate's test harness use
// specific endpoint IDs that map to specific branches.
const HRP_LIVE_EP    = 'ep-shy-tree-az32as2c';
const HRP_MP2_EP     = 'ep-empty-forest-azlhfyo9';
const HRP_LIVE_EP_2  = 'ep-other-live-zzzz1';  // second hrp-live endpoint (different ID, same branch)

const FAKE_BRANCHES = {
  'pass-hrp-live': {
    branches: [
      { id: 'br-hrp-live-001',     name: 'hrp-live',     primary: true  },
      { id: 'br-hrp-mp2-test-002', name: 'hrp_mp2_test', primary: false }
    ]
  },
  'pass-hrp-mp2': {
    branches: [
      { id: 'br-hrp-live-001',     name: 'hrp-live',     primary: true  },
      { id: 'br-hrp-mp2-test-002', name: 'hrp_mp2_test', primary: false }
    ]
  },
  'refuse-name': {
    branches: [
      { id: 'br-hrp-live-001',     name: 'hrp-live',     primary: true  },
      { id: 'br-hrp-mp2-test-002', name: 'hrp_mp2_test', primary: false }
    ]
  },
  'wrong-branch': {
    branches: [
      { id: 'br-hrp-live-001',     name: 'hrp-live',     primary: true  },
      { id: 'br-hrp-mp2-test-002', name: 'hrp_mp2_test', primary: false }
    ]
  }
};

// For 'wrong-branch' scenario we want Url1 (DATABASE_URL_ADMIN) and
// Url2 (DATABASE_URL) to point to DIFFERENT branches. The test
// harness passes the two URLs explicitly; here we just need to host
// both endpoints and let the gate figure it out.
const FAKE_ENDPOINTS = {
  'br-hrp-live-001': {
    endpoints: [
      { id: HRP_LIVE_EP,   host: HRP_LIVE_EP   + '.ap-southeast-1.aws.neon.tech', type: 'read_write' }
    ]
  },
  'br-hrp-mp2-test-002': {
    endpoints: [
      { id: HRP_MP2_EP,    host: HRP_MP2_EP    + '.ap-southeast-1.aws.neon.tech', type: 'read_write' }
    ]
  }
};

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const branchesMatch = req.url.match(/^\/api\/v2\/projects\/([^\/]+)\/branches(?:\?(.*))?$/);
  if (branchesMatch) {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { return send(res, 401, { error: 'missing bearer' }); }
    return send(res, 200, FAKE_BRANCHES[scenario] || FAKE_BRANCHES['pass-hrp-live']);
  }
  const endpointsMatch = req.url.match(/^\/api\/v2\/projects\/([^\/]+)\/branches\/([^\/]+)\/endpoints(?:\?(.*))?$/);
  if (endpointsMatch) {
    const branchId = endpointsMatch[2];
    return send(res, 200, FAKE_ENDPOINTS[branchId] || { endpoints: [] });
  }
  return send(res, 404, { error: 'not found', url: req.url });
});

server.listen(port, () => {
  console.log('[fake_neon_api] scenario=' + scenario + ' port=' + port);
});
