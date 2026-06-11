const JOBS_UPDATED_EVENT = 'careergenie:jobs-updated';

export const notifyJobsUpdated = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(JOBS_UPDATED_EVENT));
  window.localStorage.setItem('careergenie:jobs-updated', String(Date.now()));
};

export const JOBS_UPDATED_EVENT_NAME = JOBS_UPDATED_EVENT;
