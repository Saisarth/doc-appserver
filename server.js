const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const moment = require("moment");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://localhost:27017/prenatal_booking", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// **Doctor Schema**
const doctorSchema = new mongoose.Schema({
  name: String,
  workingHours: { start: String, end: String },
  specialization: String, // Optional field
});
const Doctor = mongoose.model("Doctor", doctorSchema);

// **Appointment Schema**
const appointmentSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
  date: Date,
  duration: Number,
  appointmentType: String,
  patientName: String,
  notes: String, // Optional notes field
});
const Appointment = mongoose.model("Appointment", appointmentSchema);

// **Get all doctors**
app.get("/doctors", async (req, res) => {
  try {
    const doctors = await Doctor.find();
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch doctors" });
  }
});

// **Get available slots for a doctor**
app.get("/doctors/:id/slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const doctor = await Doctor.findById(id);
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const startTime = moment(`${date} ${doctor.workingHours.start}`, "YYYY-MM-DD HH:mm");
    const endTime = moment(`${date} ${doctor.workingHours.end}`, "YYYY-MM-DD HH:mm");

    let availableSlots = [];
    let currentSlot = startTime.clone();

    while (currentSlot.isBefore(endTime)) {
      availableSlots.push(currentSlot.format("HH:mm"));
      currentSlot.add(30, "minutes");
    }

    const bookedAppointments = await Appointment.find({
      doctorId: id,
      date: { $gte: startTime.toDate(), $lt: endTime.toDate() },
    });

    const bookedSlots = bookedAppointments.map((appt) =>
      moment(appt.date).format("HH:mm")
    );

    availableSlots = availableSlots.filter((slot) => !bookedSlots.includes(slot));

    res.json(availableSlots);
  } catch (error) {
    res.status(500).json({ error: "Error fetching available slots" });
  }
});

// **Get all appointments**
app.get("/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find().populate("doctorId");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// **Get appointment by ID**
app.get("/appointments/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate("doctorId");
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Error fetching appointment details" });
  }
});

// **Create an appointment**
app.post("/appointments", async (req, res) => {
  try {
    const { doctorId, date, duration, appointmentType, patientName, notes } = req.body;
    const selectedTime = moment(date);

    const existingAppointments = await Appointment.find({
      doctorId,
      date: { $gte: selectedTime.toDate(), $lt: selectedTime.clone().add(duration, "minutes").toDate() },
    });

    if (existingAppointments.length > 0) {
      return res.status(400).json({ error: "Time slot is already booked!" });
    }

    const newAppointment = new Appointment({ doctorId, date, duration, appointmentType, patientName, notes });
    await newAppointment.save();

    res.json({ message: "Appointment booked successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error booking appointment" });
  }
});

// **Update an appointment**
app.put("/appointments/:id", async (req, res) => {
  try {
    const { date, duration, appointmentType, patientName, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    const selectedTime = moment(date);
    const conflictingAppointments = await Appointment.find({
      doctorId: appointment.doctorId,
      _id: { $ne: appointment._id },
      date: { $gte: selectedTime.toDate(), $lt: selectedTime.clone().add(duration, "minutes").toDate() },
    });

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({ error: "Time slot is already booked!" });
    }

    appointment.date = date;
    appointment.duration = duration;
    appointment.appointmentType = appointmentType;
    appointment.patientName = patientName;
    appointment.notes = notes;

    await appointment.save();
    res.json({ message: "Appointment updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error updating appointment" });
  }
});

// **Delete an appointment**
app.delete("/appointments/:id", async (req, res) => {
  try {
    await Appointment.findByIdAndDelete(req.params.id);
    res.json({ message: "Appointment deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting appointment" });
  }
});

// **Start Server**
app.listen(3004, () => console.log("Server running on port 3004"));
