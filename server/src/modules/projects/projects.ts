import {Router} from 'express'
import {z} from 'zod'
import { asyncHandler, HttpError } from '../../middleware/errors'
import { authenticateAccessToken, AuthenticateRequest } from '../../middleware/authenticateAccessToken'

import { db } from '../../db'
import { eq, and } from 'drizzle-orm'

import { periods, projects } from '../../db/schema'


const router = Router()

export async function findPeriod(projectId: string, periodId: string){
    const period = await db.query.periods.findFirst({where: 
        and(
            eq(periods.periodId, periodId),
            eq(periods.projectId, projectId)
        )
    })

    if(!period){
        throw new HttpError(404, 'Reporting period not found')
    }

    return period
}

router.get('/', authenticateAccessToken, asyncHandler(async(req: AuthenticateRequest, res) => {
    const user = req.user

    const projects = await db.select({
        
    })
}))