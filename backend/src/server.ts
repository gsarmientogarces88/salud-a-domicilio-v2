import app from './app';
import { config } from './config';
import { startPendingTimeoutJob } from './jobs/pendingTimeout.job';
import { startExpireHoldsJob } from './jobs/expireHolds.job';
import { startInProgressAutoCompleteJob } from './jobs/inProgressAutoComplete.job';
import { startLabQuoteTimeoutJob } from './jobs/labQuoteTimeout.job';

app.listen(config.port, () => {
  console.log(`🏥 API corriendo en puerto ${config.port}`);
  startPendingTimeoutJob();
  startExpireHoldsJob();
  startInProgressAutoCompleteJob();
  startLabQuoteTimeoutJob();
});
