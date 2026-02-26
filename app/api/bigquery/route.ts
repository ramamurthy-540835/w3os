import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { sql, maxResults = 1000, projectId = 'ctoteam' } = await request.json();

    if (!sql || typeof sql !== 'string') {
      return Response.json({ error: 'SQL query is required' }, { status: 400 });
    }

    // Python script to execute BigQuery query
    const pythonScript = `
import sys
import json
from datetime import datetime, date, time
from decimal import Decimal
from google.cloud import bigquery

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date, time)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

try:
    client = bigquery.Client(project='${projectId}')
    query_job = client.query("""${sql.replace(/"/g, '\\"')}""")

    # Wait for query to complete
    query_result = query_job.result()

    # Get schema from query job
    schema = []
    if query_job.schema:
        schema = [{'name': field.name, 'type': str(field.field_type)} for field in query_job.schema]

    # Get results and convert to serializable format
    rows = []
    max_results = ${maxResults}
    for i, row in enumerate(query_result):
        if i >= max_results:
            break
        row_dict = {}
        if query_job.schema:
            for field in query_job.schema:
                val = row[field.name]
                # Convert non-serializable types
                if isinstance(val, (datetime, date, time)):
                    row_dict[field.name] = val.isoformat()
                elif isinstance(val, Decimal):
                    row_dict[field.name] = float(val)
                else:
                    row_dict[field.name] = val
        else:
            # Fallback: convert Row to dict if schema is not available
            row_dict = dict(row)
        rows.append(row_dict)

    # If schema is still empty but we have rows, extract from first row
    if not schema and rows:
        schema = [{'name': k, 'type': 'UNKNOWN'} for k in rows[0].keys()]

    # Get total row count
    row_count = getattr(query_job, 'total_rows', None) or len(rows)

    result = {
        'rows': rows,
        'schema': schema,
        'rowCount': row_count,
        'error': None
    }
    print(json.dumps(result, cls=JSONEncoder))
except Exception as e:
    error_result = {
        'rows': [],
        'schema': [],
        'rowCount': 0,
        'error': str(e)
    }
    print(json.dumps(error_result))
`;

    // Write script to temp file and execute
    const tempFile = `/tmp/bq_query_${Date.now()}.py`;
    fs.writeFileSync(tempFile, pythonScript);

    const { stdout, stderr } = await execAsync(`python3 ${tempFile}`, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    // Clean up temp file
    fs.unlinkSync(tempFile);

    if (stderr) {
      console.error('BigQuery stderr:', stderr);
    }

    const result = JSON.parse(stdout);
    return Response.json(result);
  } catch (error: any) {
    console.error('BigQuery error:', error);
    return Response.json(
      {
        rows: [],
        schema: [],
        rowCount: 0,
        error: error.message || 'Failed to execute query',
      },
      { status: 500 }
    );
  }
}
