import {Router} from 'express'
import {z} from 'zod'
import { asyncHandler, HttpError } from '../../middleware/errors'
import { authenticateAccessToken, AuthenticateRequest } from '../../middleware/authenticateAccessToken'

import { db } from '../../db'
import { eq, and } from 'drizzle-orm'

import { periods, projects, users } from '../../db/schema'


const router = Router()

const projectSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name must have a max of 50 characters')
})

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
    const userId = req.user?.userId as string

    const user = await db.query.users.findFirst({where: eq(users.userId, userId)})

    if(!user){
        throw new HttpError(401, 'Authentication required')
    }

    const allProjects = await db.select().from(projects).where(
        eq(projects.ownerId, user.userId)
    )

    if(allProjects.length === 0){
        throw new HttpError(404, 'No projects found')
    }

    return res.status(200).json({projects: allProjects})
}))


router.post('/', authenticateAccessToken, asyncHandler(async(req:AuthenticateRequest, res) => {
    const userId = req.user?.userId as string

    const user = await db.query.users.findFirst({where: eq(users.userId, userId)})

    if(!user){
        throw new HttpError(401, 'Authentication required')
    }

    const validation = projectSchema.safeParse(req.body)

    if(!validation.success){
        throw new HttpError(400, 'Validation failed',
            validation.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message
            }))
        )
    }

    const data = validation.data

    const newProject = await db.insert(projects).values({
        name: data.name,
        ownerId: user.userId
    })

    res.status(201).json({
        message: 'Sucessfully added a new project',
        project: newProject
    })
}))

