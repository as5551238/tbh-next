#!/usr/bin/env bash
# SBOM generator for TBH Next
# Produces a CycloneDX-lite SBOM from package.json

set -euo pipefail
cd "$(dirname "$0")/.."

OUTFILE="sbom.json"

node -e "
const pkg = require('./package.json');
const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};

const sbom = {
  '\$schema': 'https://cyclonedx.org/schema/bom-1.5.schema.json',
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  version: 1,
  serialNumber: 'urn:uuid:' + require('crypto').randomUUID(),
  metadata: {
    component: {
      type: 'application',
      name: pkg.name,
      version: pkg.version,
      purl: 'pkg:npm/' + pkg.name + '@' + pkg.version,
    },
    timestamp: new Date().toISOString(),
    tools: [{ name: 'tbh-sbom-gen', version: '1.0.0' }],
  },
  components: Object.entries(deps).map(([name, version]) => ({
    type: 'library',
    name,
    version: version.replace(/[\^~>=<]/g, ''),
    purl: 'pkg:npm/' + name + '@' + version.replace(/[\^~>=<]/g, ''),
  })),
};

require('fs').writeFileSync('$OUTFILE', JSON.stringify(sbom, null, 2));
console.log('SBOM written to $OUTFILE (' + Object.keys(deps).length + ' components)');
"
