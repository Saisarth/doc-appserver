import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import moment from "moment";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const App = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [patientName, setPatientName] = useState("");
  const [appointmentType, setAppointmentType] = useState("Routine Check-Up");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch Doctors List
  useEffect(() => {
    axios
      .get("http://localhost:3004/doctors")
      .then((res) => setDoctors(res.data))
      .catch((err) => console.error("Error fetching doctors:", err));
  }, []);

  // Fetch Available Slots
  const fetchSlots = useCallback(() => {
    if (!selectedDoctor) {
      setMessage("Please select a doctor first!");
      return;
    }

    setLoading(true);
    const formattedDate = moment(selectedDate).format("YYYY-MM-DD");

    axios
      .get(`http://localhost:3004/doctors/${selectedDoctor}/slots?date=${formattedDate}`)
      .then((res) => setSlots(res.data))
      .catch((err) => console.error("Error fetching slots:", err))
      .finally(() => setLoading(false));
  }, [selectedDoctor, selectedDate]);

  // Book Appointment
  const bookAppointment = () => {
    if (!selectedDoctor || !selectedSlot || !patientName) {
      setMessage("Please fill all fields!");
      return;
    }

    setLoading(true);
    const appointmentData = {
      doctorId: selectedDoctor,
      date: moment(`${moment(selectedDate).format("YYYY-MM-DD")} ${selectedSlot}`, "YYYY-MM-DD HH:mm").toISOString(),
      duration: 30,
      appointmentType,
      patientName,
    };

    axios
      .post("http://localhost:3004/appointments", appointmentData)
      .then(() => {
        setMessage("✅ Appointment booked successfully!");
        setSelectedSlot(""); // Reset slot after booking
        fetchSlots(); // Refresh slots after booking
      })
      .catch(() => setMessage("❌ Error booking appointment. Try another slot."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="container mt-5">
      <div className="card shadow p-4">
        <h2 className="text-center mb-4">📅 Book an Appointment</h2>

        {/* Doctor Selection */}
        <div className="mb-3">
          <label className="form-label">👨‍⚕️ Select Doctor:</label>
          <select
            className="form-select"
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="">-- Select a Doctor --</option>
            {doctors.map((doc) => (
              <option key={doc._id} value={doc._id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div className="mb-3">
          <label className="form-label">📆 Select Date:</label>
          <div className="d-flex gap-2">
            <DatePicker
              className="form-control"
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
            />
            <button className="btn btn-primary" onClick={fetchSlots} disabled={loading}>
              {loading ? "Loading..." : "Check Slots"}
            </button>
          </div>
        </div>

        {/* Available Slots */}
        {slots.length > 0 && (
          <div className="mb-3">
            <label className="form-label">🕒 Select Time Slot:</label>
            <div className="d-flex flex-wrap">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  className={`btn ${selectedSlot === slot ? "btn-success" : "btn-outline-primary"} m-1`}
                  onClick={() => setSelectedSlot(slot)}
                  disabled={selectedSlot === slot}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Patient Details */}
        <div className="mb-3">
          <label className="form-label">👤 Patient Name:</label>
          <input
            className="form-control"
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>

        {/* Appointment Type */}
        <div className="mb-3">
          <label className="form-label">📝 Appointment Type:</label>
          <select
            className="form-select"
            value={appointmentType}
            onChange={(e) => setAppointmentType(e.target.value)}
          >
            <option>Routine Check-Up</option>
            <option>Ultrasound</option>
            <option>Operation</option>
          </select>
        </div>

        {/* Submit Button */}
        <button className="btn btn-success w-100" onClick={bookAppointment} disabled={loading}>
          {loading ? "Booking..." : "✅ Book Appointment"}
        </button>

        {/* Message */}
        {message && <p className="mt-3 alert alert-info">{message}</p>}
      </div>
    </div>
  );
};

export default App;
