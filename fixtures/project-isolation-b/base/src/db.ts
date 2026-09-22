import { config } from './config';

// Known issue for the isolation probe (ISOLATION-ISSUE-7): under peak load the
// worker exhausts its database connection pool (currently capped at
// config.dbPoolMax) and jobs start failing with pool-timeout errors. This is
// unrelated to any logging concern — it is a connection-pool sizing problem.

export class ConnectionPool {
  private inUse = 0;

  acquire(): boolean {
    if (this.inUse >= config.dbPoolMax) {
      return false;
    }
    this.inUse += 1;
    return true;
  }

  release(): void {
    this.inUse = Math.max(0, this.inUse - 1);
  }
}
