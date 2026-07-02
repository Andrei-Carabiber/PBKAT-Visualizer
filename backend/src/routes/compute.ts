import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', (req: Request, res: Response) => {

    res.json({ message: 'Successful' });
});

export default router;