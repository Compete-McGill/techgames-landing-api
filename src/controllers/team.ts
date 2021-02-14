import { Request, Response } from "express";
import { statusCodes } from "../util/statusCodes";
import { teamDBInteractions } from "../database/interactions/team";
import { validationResult } from "express-validator/check";
import { errorMessage } from "../util/errorFormatter";
import { ITeamModel, Team } from "../database/models/team";
import { ITeam } from "../interfaces/team";
import { userDBInteractions } from "../database/interactions/user";

const teamController = {

    index: async (req: Request, res: Response) => {
        try {
            const teams = await teamDBInteractions.all();
            res.status(statusCodes.SUCCESS).send(teams);
        } catch (error) {
            res.status(statusCodes.SERVER_ERROR).send(error);
        }
    },

    show: async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(statusCodes.MISSING_PARAMS).json(errors.formatWith(errorMessage).array()[0]);
        } else {
            try {
                const foundTeam: ITeamModel = await teamDBInteractions.find(req.params.teamId);
                if (foundTeam)
                    res.status(statusCodes.SUCCESS).send(foundTeam);
                else res.status(statusCodes.NOT_FOUND).send({
                    success: false,
                    message: "Team not found"
                })
            } catch (error) {
                res.status(statusCodes.SERVER_ERROR).send(error);
            }
        }
    },

    create: async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(statusCodes.MISSING_PARAMS).json(errors.formatWith(errorMessage).array()[0]);
        } else {
            try {
                const foundTeam: ITeamModel = await teamDBInteractions.findByName(req.body.name);
                if (foundTeam) {
                    res.status(statusCodes.BAD_REQUEST).send({ msg: "Team already exists" });
                    return
                }
                const teamData: ITeam = {
                    ...req.body,
                    name: req.body.name,
                    users: [],
                    score: 0
                };
                const newTeam: ITeamModel = await teamDBInteractions.create(new Team(teamData));
                newTeam.toJSON();
                res.status(statusCodes.SUCCESS).send(newTeam);

            } catch (error) {
                res.status(statusCodes.SERVER_ERROR).send(error);
            }
        }
    },

    update: async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(statusCodes.MISSING_PARAMS).json(errors.formatWith(errorMessage).array()[0]);
        } else {
            let foundTeam: ITeamModel;
            try {
                foundTeam = await teamDBInteractions.find(req.params.teamId);
            } catch (error) {
                res.status(statusCodes.SERVER_ERROR).send(error);
                return;
            }
            if (req.body.users) {
                for (const u of req.body.users) {
                    try {
                        const foundUser = await userDBInteractions.find(u);
                        if (!foundUser) {
                            res.status(statusCodes.NOT_FOUND).send({ msg: `User with id: ${u} not found` });
                            return;
                        }
                    } catch (error) {
                        res.status(statusCodes.SERVER_ERROR).send(error);
                        return;
                    }
                }
            }
            if (req.body.name) {
                try {
                    const existingTeam = await teamDBInteractions.findByName(req.body.name);
                    if (!existingTeam) {
                        res.status(statusCodes.BAD_REQUEST).send({ msg: `Team with name: ${req.body.name} already exists` });
                        return;
                    }
                } catch (error) {
                    res.status(statusCodes.SERVER_ERROR).send(error);
                }
            }
            const teamData: ITeam = {
                ...req.body,
                name: (req.body.name ? req.body.name : foundTeam.name),
                users: (req.body.users ? req.body.users : foundTeam.users)
            };
            try {
                const updatedTeam = await teamDBInteractions.update(req.params.teamId, teamData);
                res.status(statusCodes.SUCCESS).send(updatedTeam.toJSON());
            } catch (error) {
                res.status(statusCodes.SERVER_ERROR).send(error);
            }
        }
    },

    addUser: async (req: Request, res: Response) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(statusCodes.MISSING_PARAMS).json(errors.formatWith(errorMessage).array()[0]);
        } else {
            try {
                const user = await userDBInteractions.findByEmail(req.body.email);
                if (user) {
                    const team = await teamDBInteractions.find(req.params.teamId);
                    if (team) {
                        team.users.push(user.email)
                        await teamDBInteractions.update(req.params.teamId, team);
                        user.teamId = team._id;
                        await user.save();
                        res.status(statusCodes.SUCCESS).send(team);
                    } else {
                        res.status(statusCodes.NOT_FOUND).send({ status: statusCodes.NOT_FOUND, message: "Team not found" });
                        return
                    }
                } else {
                    res.status(statusCodes.NOT_FOUND).send({ status: statusCodes.NOT_FOUND, message: "User not found" });
                    return
                }

            } catch (error) {
                res.status(statusCodes.SERVER_ERROR).send(error);
            }
        }
    },

    delete: async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(statusCodes.MISSING_PARAMS).json(errors.formatWith(errorMessage).array()[0]);
        } else {
            try {
                const team = await teamDBInteractions.find(req.params.teamId);
                if (team) {
                    await teamDBInteractions.delete(req.params.teamId);
                    res.status(statusCodes.SUCCESS).send(team);
                } else {
                    res.status(statusCodes.NOT_FOUND).send({ status: statusCodes.NOT_FOUND, message: "Team not found" });
                }
            } catch (error) {
                res.status(statusCodes.SERVER_ERROR).send(error);
            }
        }
    }
};

export { teamController };