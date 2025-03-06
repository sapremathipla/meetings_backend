"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const axios_1 = __importDefault(require("axios"));
const pg_1 = require("pg");
const joi_1 = __importDefault(require("joi"));
const sequelize_1 = require("sequelize");
const sequelize = new sequelize_1.Sequelize("stage_sentinel_new", "postgres", "0xkmFCzp7RNarA0", {
    host: "staging-db-new.c69u4x9b0vhc.ap-south-1.rds.amazonaws.com",
    dialect: "postgres",
});
class Meeting extends sequelize_1.Model {
}
Meeting.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    purpose: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    startDateTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    endDateTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    attendees: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    room: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    host: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    tenantId: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize,
    modelName: "Meeting",
    tableName: "meeting",
    timestamps: true,
});
const router = express_1.default.Router();
const app = (0, express_1.default)();
const port = 5000;
const clientId = "bc5b9a9f-8f73-48a9-80b6-6a8ce4d8e622";
const clientSecret = "2-Xx~gc0.lW~V61X471gjwiSpC6dgyzR3V";
const pool = new pg_1.Pool({
    user: "postgres",
    host: "staging-db-new.c69u4x9b0vhc.ap-south-1.rds.amazonaws.com",
    database: "stage_sentinel_new",
    password: "0xkmFCzp7RNarA0",
    port: 5432,
});
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
const meetingSchema = joi_1.default.object({
    purpose: joi_1.default.string().required(),
    startDateTime: joi_1.default.date().iso().required(),
    endDateTime: joi_1.default.date().iso().required(),
    attendees: joi_1.default.string().required(),
    room: joi_1.default.string().required(),
    tenantId: joi_1.default.string().required(),
    host: joi_1.default.string().email().required(),
});
const getAccessToken = (tenantId) => __awaiter(void 0, void 0, void 0, function* () {
    const clientId = "bc5b9a9f-8f73-48a9-80b6-6a8ce4d8e622";
    const clientSecret = "2-Xx~gc0.lW~V61X471gjwiSpC6dgyzR3V";
    const response = yield axios_1.default.post(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
    }), { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    return response.data.access_token;
});
app.get("/mailservers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield pool.query('SELECT * FROM "mailServer"');
        res.json(result.rows);
    }
    catch (error) {
        console.error("Error fetching mailservers:", error);
        res.status(500).send("Server error");
    }
}));
app.post("/create-meeting", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { value } = meetingSchema.validate(req.body);
    const { purpose, startDateTime, endDateTime, attendees, room, tenantId, host } = value;
    req.app.locals.tenantId = tenantId;
    try {
        const accessToken = yield getAccessToken(tenantId);
        const response = yield axios_1.default.post(`https://graph.microsoft.com/v1.0/users/${host}/calendar/events`, {
            subject: purpose,
            start: { dateTime: startDateTime, timeZone: "UTC" },
            end: { dateTime: endDateTime, timeZone: "UTC" },
            location: { displayName: room },
            attendees: attendees.split(",").map((email) => ({
                emailAddress: { address: email.trim() },
                type: "required",
            })),
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        res.status(200).json({ message: "Meeting created successfully", data: response.data });
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error("Error creating event:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
            res.status(500).json({ error: ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || "Failed to create event" });
        }
        else if (error instanceof Error) {
            console.error("Unexpected error:", error.message);
            res.status(500).json({ error: error.message || "Unexpected error occurred" });
        }
        else {
            console.error("Unknown error:", error);
            res.status(500).json({ error: "Unknown error occurred" });
        }
    }
}));
app.get("/get-meeting-details", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const { id, host, tenantId } = req.query;
    if (!id || !host || !tenantId) {
        console.log(res.status(400).json({ error: "Meeting ID, host email, and tenant ID are required." }));
    }
    try {
        const accessToken = yield getAccessToken(tenantId);
        const response = yield axios_1.default.get(`https://graph.microsoft.com/v1.0/users/${host}/events/${id}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        const event = response.data;
        const meetingDetails = {
            id: event.id || "N/A",
            purpose: event.subject || "No Subject",
            startDateTime: ((_a = event.start) === null || _a === void 0 ? void 0 : _a.dateTime) || "N/A",
            endDateTime: ((_b = event.end) === null || _b === void 0 ? void 0 : _b.dateTime) || "N/A",
            attendees: event.attendees ? event.attendees.map((attendee) => attendee.emailAddress.address).join(", ") : "No Attendees",
            room: ((_c = event.location) === null || _c === void 0 ? void 0 : _c.displayName) || "No Room Specified",
            host: host,
        };
        res.status(200).json(meetingDetails);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error("Error fetching event details:", ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
            res.status(500).json({ error: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.data) || "Failed to fetch event details" });
        }
        else if (error instanceof Error) {
            console.error("Unexpected error:", error.message);
            res.status(500).json({ error: error.message || "Unexpected error occurred" });
        }
        else {
            console.error("Unknown error:", error);
            res.status(500).json({ error: "Unknown error occurred" });
        }
    }
}));
// app.get("/meetings", async (req: Request, res: Response): Promise<void> => {
//   const { startDateTime, host } = req.query;
//   if (!startDateTime || !host) {
//     res.status(400).json({ error: "Both 'startDateTime' and 'host' parameters are required." });
//     return;
//   }
//   try {
//     const parsedStartDateTime = moment(startDateTime as string); // Expecting ISO date string from the form
//     if (!parsedStartDateTime.isValid()) {
//       res.status(400).json({ error: "Invalid startDateTime format. Please use a valid date and time." });
//       return;
//     }
//     const startEpochTime = parsedStartDateTime.valueOf(); 
//     const endEpochTime = parsedStartDateTime.add(24, "hours").valueOf(); 
//     const query = `
//     SELECT 
//     m.*,
//     r.name AS room_name,
//     rmsm.identifier AS room_identifier,
//     e.email AS e_mail,
//     v.email AS visitor_email -- Add visitor email
//     FROM 
//     "meeting" m
//     JOIN 
//     "meetingParticipant" mp ON m."id" = mp."meetingId"
//     JOIN 
//     "employee" e ON mp."employeeId" = e."id"
//     JOIN 
//     "room" r ON m."roomId" = r."id" 
//     JOIN 
//     "roomMailServerMap" rmsm ON r."id" = rmsm."roomId"
//     LEFT JOIN 
//     "visitor" v ON mp."visitorId" = v."id"
//     WHERE 
//     e."email" = $1
//     AND m."startTime" >= $2
//     AND m."startTime" < $3
//     AND m."hiplaStatus" = 'true';
//     `;
//   const visitorsQuery = `
//    SELECT 
//       mp."meetingId",
//       STRING_AGG(v.email, ', ') AS visitor_emails
//     FROM 
//       "meetingParticipant" mp
//     LEFT JOIN 
//       "visitor" v ON mp."visitorId" = v."id"
//     WHERE 
//       mp."meetingId" IN (SELECT id FROM "meeting" WHERE "startTime" >= $1 AND "startTime" < $2)
//     GROUP BY 
//       mp."meetingId";
// `;
//     const values = [host, startEpochTime, endEpochTime];
//     const result = await pool.query(query, values);
//     const visitors = await pool.query(visitorsQuery, [startEpochTime, endEpochTime]);
//     console.log("Values",values);
//     console.log(result.rows);
//     const visitorMap: { [key: string]: string } = {};
//     for (const visitor of visitors.rows || []) {
//       if (visitor.meetingId) {
//         visitorMap[visitor.meetingId] = visitorMap[visitor.meetingId]
//           ? `${visitorMap[visitor.meetingId]}, ${visitor.visitor_emails}`
//           : visitor.visitor_emails || 'No Visitors';
//       }
//     }
//     const mappedMeetings = [];
//     for (const meeting of result.rows || []) {
//       const visitorEmails = visitorMap[meeting.id] || 'No Visitors';
//       mappedMeetings.push({
//         ...meeting,
//         visitor_emails: visitorEmails,
//       });
//     }
//     // Send the enriched data to the frontend
//     res.status(200).json(mappedMeetings);
//   } catch (error) {
//     console.error('Error fetching meetings:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
// app.put("/update-meeting", async (req: Request, res: Response): Promise<void> =>{
//   const { id, startTime, endTime, purpose, room} = req.body;
//   if (!id || !startTime || !endTime || !purpose || !room) {
//     console.log(res.status(400).json({ error: "All fields are required." }));
//   }
//   const client = await pool.connect();
//   try {
//     await client.query("BEGIN");
//     const roomIdQuery = `SELECT id FROM "room" WHERE name = $1;`;
//     const roomResult = await client.query(roomIdQuery, [room]);
//     if (roomResult.rowCount === 0) {
//       throw new Error(`Room with name '${room}' does not exist.`);
//     }
//     const roomId = roomResult.rows[0].id;
//     // Update meeting details
//     await client.query(
//       `
//       UPDATE "meeting"
//       SET 
//         "startTime" = $1,
//         "endTime" = $2,
//         "purpose" = $3,
//         "roomId" = $4
//       WHERE 
//         "id" = $5;
//       `,
//       [startTime, endTime, purpose, roomId, id]
//     );
//   const visitorIdQuery = `
//   SELECT id FROM "visitor" WHERE email = ANY($1::text[]);
// `;
// const visitorResult = await client.query(visitorIdQuery, [attendees]);
// const visitorIds = visitorResult.rows.map((row) => row.id);
// // const missingEmails = attendees.filter((email: string) => 
// //   !visitorResult.rows.some((row) => row.email === email)
// // );
// const existingEmails = visitorResult.rows.map((row) => row.email);
// const missingEmails = attendees.filter((email: string) => !existingEmails.includes(email));
// if (missingEmails.length > 0) {
//   const insertMissingVisitorsQuery = `
//     INSERT INTO "visitor" ("email")
//     VALUES ${missingEmails.map((email: string) => `('${email}')`).join(", ")}
//     ON CONFLICT ("email") DO NOTHING;
//   `;
//   await client.query(insertMissingVisitorsQuery);
// }
// // Update attendees (delete old attendees and insert new ones)
// await client.query(`DELETE FROM "meetingParticipant" WHERE "meetingId" = $1;`, [id]);
// const insertAttendeesQuery = `
//   INSERT INTO "meetingParticipant" ("meetingId", "visitorId")
//   SELECT $1, UNNEST($2::UUID[]);
// `;
// await client.query(insertAttendeesQuery, [id, visitorIds]);
//     await client.query("COMMIT");
//     res.status(200).json({ message: "Meeting updated successfully." });
//   } catch (error) {
//     await client.query("ROLLBACK");
//     console.error("Error updating meeting:", error);
//     res.status(500).json({ error: "Failed to update meeting." });
//   } finally {
//     client.release();
//   }
// });
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
