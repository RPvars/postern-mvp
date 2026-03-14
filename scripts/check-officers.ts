import 'dotenv/config';
import { httpClient } from '../lib/business-register/client/http';

async function main() {
  const entity = await httpClient.getLegalEntity('40003032949');
  console.log(JSON.stringify(entity.officers?.slice(0, 3), null, 2));
}
main().catch(console.error);
