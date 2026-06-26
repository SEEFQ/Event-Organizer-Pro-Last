import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import registrationsRouter from "./registrations";
import commentsRouter from "./comments";
import statsRouter from "./stats";
import publicRouter from "./public";
import storageRouter from "./storage";
import sponsorsRouter from "./sponsors";
import participantsRouter from "./participants";
import eventTypesRouter from "./event-types";
import completedEventsRouter from "./completed-events";
import mediaBannersRouter from "./media-banners";
import financialsRouter from "./financials";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(registrationsRouter);
router.use(commentsRouter);
router.use(statsRouter);
router.use(publicRouter);
router.use("/storage", storageRouter);
router.use(sponsorsRouter);
router.use(participantsRouter);
router.use(eventTypesRouter);
router.use(completedEventsRouter);
router.use(mediaBannersRouter);
router.use(financialsRouter);
router.use(adminRouter);

export default router;
