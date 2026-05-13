import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import eventsRouter from "./events";
import reviewsRouter from "./reviews";
import ordersRouter from "./orders";
import paymentRouter from "./payment";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(eventsRouter);
router.use(reviewsRouter);
router.use(ordersRouter);
router.use(paymentRouter);
router.use(storageRouter);

export default router;
