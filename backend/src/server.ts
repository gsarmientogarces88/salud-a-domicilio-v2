import app from './app';
import { config } from './config';
import { startPendingTimeoutJob } from './jobs/pendingTimeout.job';

app.listen(config.port, () => {
  console.log(`🏥 API corriendo en puerto ${config.port}`);
  startPendingTimeoutJob();
});
