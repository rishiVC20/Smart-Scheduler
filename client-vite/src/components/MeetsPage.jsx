import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getToken } from '../utils/auth';

const MeetsPage = ({ user }) => {
  const [meetings, setMeetings] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [submitting, setSubmitting] = useState({});
  const [loadingSuggest, setLoadingSuggest] = useState({});
  const [scheduling, setScheduling] = useState({});
  const [scheduleError, setScheduleError] = useState({});
  const [showSuggestPopup, setShowSuggestPopup] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [suggested, setSuggested] = useState({});

  // States for the new timing submission popup
  const [showTimingPopup, setShowTimingPopup] = useState(false);
  const [selectedMeetingForTiming, setSelectedMeetingForTiming] = useState(null);
  const [multipleTimings, setMultipleTimings] = useState([{ start: '', end: '' }]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch meetings');
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/meetings/notifications', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setPendingCount(data.count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchPendingCount();
  }, []);
  
  const isHost = (meeting) => String(meeting.host._id) === String(user._id);
  const isInvitee = (meeting) => meeting.invitees.some(i => String(i._id) === String(user._id));
  const getInviteeResponse = (meeting) => meeting.inviteeResponses.find(r => String(r.user._id) === String(user._id));

  // --- Date & Time Formatting (with fix for "Invalid Date") ---
  const formatDate = (dateString) => {
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') {
      return 'Date TBD';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') {
       return '';
    }
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  // --- Status Logic ---
  const getMeetingStatus = (meeting) => {
    if (meeting.finalizedSlot && meeting.finalizedSlot.start) return 'Finalized';
    if (meeting.status === 'awaiting_selection') return 'Awaiting Selection';
    return 'Pending Input';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalized': return 'bg-green-100 text-green-800';
      case 'Awaiting Selection': return 'bg-blue-100 text-blue-800';
      case 'Pending Input': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- Timing Submission Popup Logic ---
  const openTimingPopup = (meeting) => {
    setSelectedMeetingForTiming(meeting);
    setMultipleTimings([{ start: '', end: '' }]);
    setShowTimingPopup(true);
  };

  const addTimingSlot = () => setMultipleTimings([...multipleTimings, { start: '', end: '' }]);
  const removeTimingSlot = (index) => setMultipleTimings(multipleTimings.filter((_, i) => i !== index));

  const updateTimingSlot = (index, field, value) => {
    const updated = [...multipleTimings];
    updated[index][field] = value;
    setMultipleTimings(updated);
  };
  
  const submitMultipleTimings = async () => {
    const meetingId = selectedMeetingForTiming._id;
    setSubmitting(prev => ({ ...prev, [meetingId]: true }));

    const validTimings = multipleTimings.filter(t => t.start && t.end);
    if (validTimings.length === 0) {
      toast.error('Please add and fill at least one time slot.');
      setSubmitting(prev => ({ ...prev, [meetingId]: false }));
      return;
    }

    try {
      // First, clear any existing timings for this user on this meeting
      await fetch(`/api/meetings/${meetingId}/clear-timings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      });
      
      // Then, submit all new timings
      for (const timing of validTimings) {
        await fetch(`/api/meetings/${meetingId}/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ start: new Date(timing.start), end: new Date(timing.end) }),
        });
      }
      toast.success('Your availability has been submitted!');
      setShowTimingPopup(false);
      fetchMeetings();
      fetchPendingCount();
    } catch (error) {
      toast.error('An error occurred while submitting.');
    } finally {
      setSubmitting(prev => ({ ...prev, [meetingId]: false }));
    }
  };

  // --- Suggest Times Popup Logic ---
  const handleSuggestTimes = async (meeting) => {
    setSelectedMeeting(meeting);
    setLoadingSuggest(prev => ({ ...prev, [meeting._id]: true }));
    try {
      const res = await fetch(`/api/meetings/${meeting._id}/suggest-times`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setSuggested(prev => ({ ...prev, [meeting._id]: data }));
      setShowSuggestPopup(true);
    } catch (error) {
      toast.error('Failed to get suggestions.');
    } finally {
      setLoadingSuggest(prev => ({ ...prev, [meeting._id]: false }));
    }
  };
  
  // --- Schedule Meet Logic ---
  const handleScheduleMeet = async (meeting, slot) => {
    setScheduling(prev => ({ ...prev, [meeting._id]: true }));
    try {
        const participants = [meeting.host, ...meeting.invitees].filter(p => slot.participants.some(sp => sp._id === p._id));
        const res = await fetch(`/api/meetings/${meeting._id}/schedule-gmeet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ start: slot.start, end: slot.end, participants }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to schedule.');
        
        toast.success('Meeting scheduled successfully!');
        setShowSuggestPopup(false);
        fetchMeetings();
    } catch (err) {
        toast.error(err.message || 'Failed to schedule meet.');
    } finally {
        setScheduling(prev => ({ ...prev, [meeting._id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Meetings</h1>
            {pendingCount > 0 && (
                <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    {pendingCount} pending response{pendingCount > 1 ? 's' : ''}
                </div>
            )}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Meeting', 'Host', 'Participants', 'Duration', 'Status', 'Actions'].map(header => (
                    <th key={header} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meetings.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No meetings found.</td></tr>
                ) : (
                  meetings.map(meeting => (
                    <tr key={meeting._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate">{meeting.title}</div>
                        <div className="text-sm text-gray-500 mt-1 truncate">{meeting.description}</div>
                        <div className="text-sm text-gray-600 mt-1">
                            📅 {formatDate(meeting.finalizedSlot?.start)} {formatTime(meeting.finalizedSlot?.start)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{meeting.host.name}</div>
                        <div className="text-sm text-gray-500">{meeting.host.email}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-900 truncate">{meeting.invitees.map(i => i.name).join(', ')}</div>
                        {isHost(meeting) && (
                            <div className="text-xs text-blue-600 mt-1 font-medium">
                                {meeting.submittedCount} of {meeting.invitees.length} submitted
                            </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{meeting.duration} min</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(getMeetingStatus(meeting))}`}>
                          {getMeetingStatus(meeting)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          {isHost(meeting) && getMeetingStatus(meeting) !== 'Finalized' &&(
                            <button
                              onClick={() => handleSuggestTimes(meeting)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
                              disabled={loadingSuggest[meeting._id] || meeting.submittedCount < meeting.invitees.length}
                              title={meeting.submittedCount < meeting.invitees.length ? 'Waiting for all participants to respond' : 'Suggest meeting times'}
                            >
                              {loadingSuggest[meeting._id] ? 'Loading...' : 'Suggest Times'}
                            </button>
                          )}
                          {isInvitee(meeting) && !getInviteeResponse(meeting) && getMeetingStatus(meeting) === 'Pending Input' && (
                            <button onClick={() => openTimingPopup(meeting)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">
                              Submit Timings
                            </button>
                          )}
                          {meeting.finalizedSlot?.start && meeting.meetLink &&(
                            <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition text-center">
                              Join Meeting
                            </a>
                          )}
                          {isInvitee(meeting) && getInviteeResponse(meeting) && (
                            <span className="text-xs text-green-600 font-medium">✓ Response Submitted</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Submit Timings Popup */}
      {showTimingPopup && selectedMeetingForTiming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Submit Your Availability</h3>
            <div className="space-y-4 mb-6">
              {multipleTimings.map((timing, index) => (
                <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="datetime-local" className="w-full px-3 py-2 border rounded-md" value={timing.start} onChange={e => updateTimingSlot(index, 'start', e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="datetime-local" className="w-full px-3 py-2 border rounded-md" value={timing.end} onChange={e => updateTimingSlot(index, 'end', e.target.value)} />
                  </div>
                  <button onClick={() => removeTimingSlot(index)} className="px-3 py-2 text-red-600 hover:text-red-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              <button onClick={addTimingSlot} className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400">
                + Add Another Time Slot
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTimingPopup(false)} className="flex-1 px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={submitMultipleTimings} disabled={submitting[selectedMeetingForTiming?._id]} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {submitting[selectedMeetingForTiming?._id] ? 'Submitting...' : 'Submit Timings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Times Popup */}
      {showSuggestPopup && selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Suggested Times for "{selectedMeeting.title}"</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Start Time</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Participants</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(suggested[selectedMeeting._id] || []).length > 0 ? (
                                suggested[selectedMeeting._id].map((slot, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {formatDate(slot.start)} at {formatTime(slot.start)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {slot.participants.length} ({slot.participants.map(p => p.name).join(', ')})
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleScheduleMeet(selectedMeeting, slot)}
                                                disabled={scheduling[selectedMeeting._id]}
                                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition"
                                            >
                                                {scheduling[selectedMeeting._id] ? 'Scheduling...' : 'Schedule'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" className="py-8 text-center text-gray-500">No suitable time slots found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={() => setShowSuggestPopup(false)} className="px-4 py-2 border rounded-md">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default MeetsPage; 