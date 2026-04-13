import React, { useState, useEffect } from 'react';
import { Save, UploadCloud, Check, ChevronRight, ChevronLeft, Plus, X } from 'lucide-react';
import styles from './StudentForm.module.css';

const steps = [
  { id: 1, title: 'Basic Info', desc: 'Name, DOB, gender' },
  { id: 2, title: 'Academic', desc: 'Grade, section, IDs' },
  { id: 3, title: 'Parents', desc: 'Guardian details' },
  { id: 4, title: 'Address', desc: 'Contact & location' },
  { id: 5, title: 'Health', desc: 'Medical history' },
  { id: 6, title: 'Transport', desc: 'Bus & hostel info' },
  { id: 7, title: 'Documents', desc: 'KYC & files' },
  { id: 8, title: 'Review', desc: 'Final check before save' }
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'birth_certificate', label: 'Birth Certificate' },
  { value: 'previous_transcript', label: 'Previous Transcript' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'aadhaar_card', label: 'Aadhaar Card' },
  { value: 'other', label: 'Other / Custom' },
];

const createDocumentEntry = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  file: null,
  document_type: 'other',
  title: '',
});

const StudentForm = ({ onCancel, onSaved, studentId = null, inquiryId = null }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const isEditMode = Boolean(studentId);
  const [formData, setFormData] = useState({
    // User / Basic
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: 'Student@123', // Default password
    phone: '',
    student_email: '',
    student_phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    
    // Academic
    grade: '',
    section: '',
    admission_number: `ADM-${Math.floor(1000 + Math.random() * 9000)}`,
    admission_date: new Date().toISOString().split('T')[0],
    // Parents
    father_name: '',
    father_occupation: '',
    mother_name: '',
    mother_occupation: '',
    parent_phone: '',
    parent_email: '',
    guardian_name: '',
    guardian_relation: '',
    guardian_phone: '',
    guardian_email: '',
    
    // Address
    address: '',
    emergency_contact_phone: '',
    emergency_contact_name: '',
    
    // Health
    health_notes: '',
    allergies: '',
    
    // Transport
    transport_user: false,
    hostel_resident: false,
  });

  const [documents, setDocuments] = useState([createDocumentEntry()]);
  const [photo, setPhoto] = useState(null); // Profile photo file
  const [photoPreview, setPhotoPreview] = useState('');
  const [signature, setSignature] = useState(null); // Optional signature file
  const [signaturePreview, setSignaturePreview] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addDocumentEntry = () => {
    setDocuments((prev) => [...prev, createDocumentEntry()]);
  };

  const updateDocumentEntry = (id, updates) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc)));
  };

  const removeDocumentEntry = (id) => {
    setDocuments((prev) => {
      const next = prev.filter((doc) => doc.id !== id);
      return next.length ? next : [createDocumentEntry()];
    });
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSignatureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignature(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleNext = () => {
    // Generate username if not set (first + last)
    if (activeStep === 1 && !formData.username) {
       const genUsername = (formData.first_name + formData.last_name).toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 100);
       setFormData(prev => ({ ...prev, username: genUsername }));
    }
    setActiveStep(prev => Math.min(prev + 1, 8));
  };
  const handlePrev = () => setActiveStep(prev => Math.max(prev - 1, 1));
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/students/classes/', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await res.json();
        setGrades(data);
      } catch (err) { console.error(err); }
    };
    fetchGrades();
  }, []);

  // Fetch sections when grade changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!formData.grade) {
        setSections([]);
        return;
      }
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/students/sections/?class=${formData.grade}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        const data = await res.json();
        setSections(data);
      } catch (err) { console.error(err); }
    };
    fetchSections();
  }, [formData.grade]);

  useEffect(() => {
    const fetchStudentForEdit = async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/students/students/${studentId}/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (!res.ok) throw new Error('Failed to load student');
        const student = await res.json();
        const profile = student.user?.profile || {};
        setFormData((prev) => ({
          ...prev,
          first_name: student.user?.first_name || '',
          last_name: student.user?.last_name || '',
          username: student.user?.username || '',
          email: student.user?.email || '',
          phone: student.user?.phone || '',
          student_email: student.user?.email || '',
          student_phone: student.user?.phone || '',
          date_of_birth: profile.date_of_birth || '',
          gender: profile.gender || '',
          blood_group: profile.blood_group || '',
          section: student.section || '',
          admission_number: student.admission_number || prev.admission_number,
          admission_date: student.admission_date || '',
          previous_school: student.previous_school || '',
          father_name: profile.father_name || '',
          father_occupation: profile.father_occupation || '',
          mother_name: profile.mother_name || '',
          mother_occupation: profile.mother_occupation || '',
          parent_phone: profile.parent_phone || '',
          parent_email: profile.parent_email || '',
          guardian_name: profile.guardian_name || '',
          guardian_relation: profile.guardian_relation || '',
          guardian_phone: profile.guardian_phone || '',
          guardian_email: profile.guardian_email || '',
          address: profile.address || '',
          emergency_contact_phone: profile.emergency_contact_phone || '',
          emergency_contact_name: profile.emergency_contact_name || '',
          health_notes: profile.health_notes || '',
          allergies: profile.allergies || '',
          transport_user: Boolean(student.transport_user),
          hostel_resident: Boolean(student.hostel_resident),
        }));
        if (profile.photo) {
          setPhotoPreview(`http://127.0.0.1:8000${profile.photo}`);
        }
        if (profile.signature) {
          setSignaturePreview(`http://127.0.0.1:8000${profile.signature}`);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load student for edit.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentForEdit();
  }, [studentId]);

  useEffect(() => {
    const fetchInquiryForPrefill = async () => {
      if (!inquiryId || isEditMode) return;
      setLoading(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/students/admission-inquiries/${inquiryId}/`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (!res.ok) throw new Error('Failed to load inquiry');
        const inquiry = await res.json();
        
        let firstName = inquiry.student_name;
        let lastName = '';
        if (inquiry.student_name && inquiry.student_name.includes(' ')) {
           const parts = inquiry.student_name.split(' ');
           firstName = parts[0];
           lastName = parts.slice(1).join(' ');
        }

        setFormData((prev) => ({
          ...prev,
          first_name: firstName || '',
          last_name: lastName || '',
          grade: inquiry.class_requested || '',
          guardian_name: inquiry.guardian_name || '',
          guardian_phone: inquiry.contact_phone || '',
          guardian_email: inquiry.contact_email || '',
          previous_school: inquiry.previous_school || '',
          health_notes: inquiry.notes || '', // push notes into health/internal notes just in case
        }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInquiryForPrefill();
  }, [inquiryId, isEditMode]);

  const handleStepClick = (id) => {
    // Optionally allow jumping to previous steps only
    if (id < activeStep) setActiveStep(id);
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Basic Information</h3>
              <p className={styles.stepSubtitle}>Enter the student&apos;s primary demographic details.</p>
            </div>
            
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>First Name</label>
                <input 
                  type="text" 
                  name="first_name"
                  className={styles.formInput} 
                  placeholder="e.g. Kristina" 
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Last Name</label>
                <input 
                  type="text" 
                  name="last_name"
                  className={styles.formInput} 
                  placeholder="e.g. Sanchez" 
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.grid3}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Date of Birth</label>
                <input 
                  type="date" 
                  name="date_of_birth"
                  className={styles.formInput} 
                  value={formData.date_of_birth}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Gender</label>
                <select 
                  name="gender"
                  className={styles.formSelect} 
                  value={formData.gender}
                  onChange={handleChange}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Blood Group</label>
                <select 
                  name="blood_group"
                  className={styles.formSelect} 
                  value={formData.blood_group}
                  onChange={handleChange}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Academic Enrollment</h3>
              <p className={styles.stepSubtitle}>Specify the grade, section, and admission details.</p>
            </div>
            
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Grade / Class</label>
                <select 
                  name="grade"
                  className={styles.formSelect} 
                  value={formData.grade}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, grade: e.target.value, section: '' }));
                  }}
                >
                  <option value="">Select Grade</option>
                  {grades.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Section</label>
                <select 
                  name="section"
                  className={styles.formSelect} 
                  value={formData.section}
                  onChange={handleChange}
                >
                  <option value="">Select Section</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Admission Date</label>
                <input 
                  type="date" 
                  name="admission_date"
                  className={styles.formInput} 
                  value={formData.admission_date}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Admission Number</label>
                <input 
                  type="text" 
                  name="admission_number"
                  className={styles.formInput} 
                  value={formData.admission_number}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Previous School (If any)</label>
              <input 
                type="text" 
                name="previous_school"
                className={styles.formInput} 
                placeholder="Enter school name" 
                value={formData.previous_school}
                onChange={handleChange}
              />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Parent / Guardian Details</h3>
              <p className={styles.stepSubtitle}>Enter details for primary guardians.</p>
            </div>
            
            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Father&apos;s Name</label>
                <input 
                  type="text" 
                  name="father_name"
                  className={styles.formInput} 
                  placeholder="e.g. Douglas Peterson" 
                  value={formData.father_name}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Father&apos;s Occupation</label>
                <input 
                  type="text" 
                  name="father_occupation"
                  className={styles.formInput} 
                  placeholder="e.g. Engineer" 
                  value={formData.father_occupation}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mother&apos;s Name</label>
                <input 
                  type="text" 
                  name="mother_name"
                  className={styles.formInput} 
                  placeholder="e.g. Molly Morgan" 
                  value={formData.mother_name}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mother&apos;s Occupation</label>
                <input 
                   type="text" 
                   name="mother_occupation"
                   className={styles.formInput} 
                   placeholder="e.g. Teacher" 
                   value={formData.mother_occupation}
                   onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Parent Mobile (Optional)</label>
                <input
                  type="text"
                  name="parent_phone"
                  className={styles.formInput}
                  placeholder="+91 9XXXXXXXXX"
                  value={formData.parent_phone}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Parent Email (Optional)</label>
                <input
                  type="email"
                  name="parent_email"
                  className={styles.formInput}
                  placeholder="parent@example.com"
                  value={formData.parent_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Guardian Name (Optional)</label>
                <input
                  type="text"
                  name="guardian_name"
                  className={styles.formInput}
                  placeholder="For college / alternate contact"
                  value={formData.guardian_name}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Guardian Relation (Optional)</label>
                <input
                  type="text"
                  name="guardian_relation"
                  className={styles.formInput}
                  placeholder="Guardian / Spouse / Local Guardian"
                  value={formData.guardian_relation}
                  onChange={handleChange}
                />
              </div>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Address & Contact</h3>
              <p className={styles.stepSubtitle}>Contact numbers and physical addresses.</p>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Student Mobile (Optional)</label>
                <input 
                  type="text" 
                  name="student_phone"
                  className={styles.formInput} 
                  placeholder="+1 (555) 000-0000" 
                  value={formData.student_phone}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Student Email (Optional)</label>
                <input 
                  type="email" 
                  name="student_email"
                  className={styles.formInput} 
                  placeholder="student@example.com" 
                  value={formData.student_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Guardian Mobile (Optional)</label>
                <input
                  type="text"
                  name="guardian_phone"
                  className={styles.formInput}
                  placeholder="+91 9XXXXXXXXX"
                  value={formData.guardian_phone}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Guardian Email (Optional)</label>
                <input
                  type="email"
                  name="guardian_email"
                  className={styles.formInput}
                  placeholder="guardian@example.com"
                  value={formData.guardian_email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Present Address</label>
              <textarea 
                name="address"
                className={styles.formTextarea} 
                placeholder="Street, City, State, Zip"
                value={formData.address}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className={styles.checkboxGroup}>
              <input type="checkbox" className={styles.checkboxInput} id="sameAddr" />
              <label htmlFor="sameAddr" className={styles.checkboxLabel}>Permanent address is same as present address</label>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Health & Medical</h3>
              <p className={styles.stepSubtitle}>Critical medical information for emergencies.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Known Allergies</label>
              <input 
                type="text" 
                name="allergies"
                className={styles.formInput} 
                placeholder="e.g. Peanuts, Penicillin" 
                value={formData.allergies}
                onChange={handleChange}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Chronic Medical Conditions / Notes</label>
              <textarea 
                name="health_notes"
                className={styles.formTextarea} 
                placeholder="Asthma, Diabetes, etc."
                value={formData.health_notes}
                onChange={handleChange}
              ></textarea>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Emergency Contact Name (Guardian)</label>
                <input 
                  type="text" 
                  name="emergency_contact_name"
                  className={styles.formInput} 
                  placeholder="Guardian Name" 
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Emergency Contact Phone</label>
                <input 
                  type="text" 
                  name="emergency_contact_phone"
                  className={styles.formInput} 
                  placeholder="Phone number" 
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </>
        );
      case 6:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Transport / Hostel</h3>
              <p className={styles.stepSubtitle}>Logistics and accommodation details.</p>
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Availing School Transport?</label>
                <select 
                  name="transport_user"
                  className={styles.formSelect}
                  value={formData.transport_user}
                  onChange={(e) => setFormData(prev => ({ ...prev, transport_user: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Hostel Required?</label>
                <select 
                  name="hostel_resident"
                  className={styles.formSelect}
                  value={formData.hostel_resident}
                  onChange={(e) => setFormData(prev => ({ ...prev, hostel_resident: e.target.value === 'true' }))}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </>
        );
      case 7:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>KYC & Document Uploads</h3>
              <p className={styles.stepSubtitle}>Upload valid documents for verification.</p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Passport Size Photo (Used as Profile Photo)</label>
              <div className={styles.grid2}>
                <div className={styles.uploadArea} onClick={() => document.getElementById('passport-photo-upload').click()}>
                  <UploadCloud size={28} className={styles.uploadIcon} />
                  <input
                    type="file"
                    id="passport-photo-upload"
                    accept="image/*"
                    hidden
                    onChange={handlePhotoChange}
                  />
                  <p className={styles.uploadText}>
                    <span className={styles.uploadHighlight}>Upload passport photo</span><br />
                    JPG, PNG (recommended 300x300)
                  </p>
                </div>
                <div className={styles.uploadArea}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Passport Preview" className={styles.passportPreview} />
                  ) : (
                    <p className={styles.uploadText}>No photo selected</p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Signature Upload (Optional)</label>
              <div className={styles.grid2}>
                <div className={styles.uploadArea} onClick={() => document.getElementById('signature-upload').click()}>
                  <UploadCloud size={28} className={styles.uploadIcon} />
                  <input
                    type="file"
                    id="signature-upload"
                    accept="image/*"
                    hidden
                    onChange={handleSignatureChange}
                  />
                  <p className={styles.uploadText}>
                    <span className={styles.uploadHighlight}>Upload signature</span><br />
                    PNG/JPG with clear background preferred
                  </p>
                </div>
                <div className={styles.uploadArea}>
                  {signaturePreview ? (
                    <img src={signaturePreview} alt="Signature Preview" className={styles.signaturePreview} />
                  ) : (
                    <p className={styles.uploadText}>No signature selected</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className={styles.documentsHeader}>
              <h4 className={styles.documentsTitle}>KYC Documents</h4>
              <button type="button" className={styles.addDocumentBtn} onClick={addDocumentEntry}>
                <Plus size={14} /> Add Document
              </button>
            </div>

            <div className={styles.docList}>
              {documents.map((doc, idx) => (
                <div key={doc.id} className={styles.docItem}>
                  <div className={styles.grid2}>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Document Type</label>
                      <select
                        className={styles.formSelect}
                        value={doc.document_type}
                        onChange={(e) => updateDocumentEntry(doc.id, { document_type: e.target.value })}
                      >
                        {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Document Name / Label</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="e.g. Semester 2 Marksheet, Migration Certificate"
                        value={doc.title}
                        onChange={(e) => updateDocumentEntry(doc.id, { title: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className={styles.docRow}>
                    <label className={styles.docFileLabel}>
                      <UploadCloud size={16} />
                      <span>{doc.file ? 'Change file' : 'Upload file'}</span>
                      <input
                        type="file"
                        hidden
                        onChange={(e) => updateDocumentEntry(doc.id, { file: e.target.files?.[0] || null })}
                      />
                    </label>

                    <div className={styles.docInfo}>
                      <span className={styles.docName}>{doc.file?.name || 'No file selected'}</span>
                      <span className={styles.docSize}>
                        {doc.file ? `${(doc.file.size / 1024).toFixed(1)} KB` : 'PDF, JPG, PNG supported'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={styles.docRemove}
                      onClick={() => removeDocumentEntry(doc.id)}
                      title={`Remove document ${idx + 1}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case 8:
        return (
          <>
            <div className={styles.stepHeaderRow}>
              <h3 className={styles.stepMainTitle}>Review & Submit</h3>
              <p className={styles.stepSubtitle}>Please review the entered details before finalizing.</p>
            </div>

            <div className={styles.summaryBlock}>
              <h4 className={styles.summaryTitle}>Basic & Academic</h4>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Student Name:</span>
                <span className={styles.summaryVal}>{formData.first_name} {formData.last_name}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Username:</span>
                <span className={styles.summaryVal}>{formData.username}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Grade / Section:</span>
                <span className={styles.summaryVal}>
                  {grades.find(g => g.id == formData.grade)?.name || 'N/A'} - {sections.find(s => s.id == formData.section)?.name || 'N/A'}
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Admission ID:</span>
                <span className={styles.summaryVal}>{formData.admission_number}</span>
              </div>
            </div>

            <div className={styles.summaryBlock}>
              <h4 className={styles.summaryTitle}>Health & Transport</h4>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Transport:</span>
                <span className={styles.summaryVal}>{formData.transport_user ? 'Yes' : 'No'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Hostel:</span>
                <span className={styles.summaryVal}>{formData.hostel_resident ? 'Yes' : 'No'}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Allergies:</span>
                <span className={styles.summaryVal}>{formData.allergies || 'None'}</span>
              </div>
            </div>
            
            <div className={styles.checkboxGroup}>
              <input type="checkbox" className={styles.checkboxInput} id="terms" required />
              <label htmlFor="terms" className={styles.checkboxLabel}>I verify that all entered details and documents are authentic.</label>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      const payload = {
        email: formData.student_email || formData.email || '',
        phone: formData.student_phone || formData.phone || '',
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username,
        password: isEditMode ? '' : formData.password,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        blood_group: formData.blood_group,
        address: formData.address,
        health_notes: formData.health_notes,
        allergies: formData.allergies,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        father_name: formData.father_name,
        father_occupation: formData.father_occupation,
        mother_name: formData.mother_name,
        mother_occupation: formData.mother_occupation,
        parent_phone: formData.parent_phone,
        parent_email: formData.parent_email,
        guardian_name: formData.guardian_name,
        guardian_relation: formData.guardian_relation,
        guardian_phone: formData.guardian_phone,
        guardian_email: formData.guardian_email,
        admission_number: formData.admission_number,
        section: formData.section,
        admission_date: formData.admission_date,
        hostel_resident: formData.hostel_resident,
        transport_user: formData.transport_user,
        previous_school: formData.previous_school,
      };
      // Add all text fields
      Object.keys(payload).forEach(key => {
        if (payload[key] !== undefined && payload[key] !== null) {
          data.append(key, payload[key]);
        }
      });
      if (photo) {
        data.append('photo', photo);
      }
      if (signature) {
        data.append('signature', signature);
      }

      // Special Mapping for Serializer expectations 
      // The serializer expects 'section' (id) and 'academic_year' (id)
      // and 'first_name', 'last_name', 'email', 'username', 'password', 'phone'
      // We already have these in formData.

      const endpoint = isEditMode
        ? `http://127.0.0.1:8000/api/students/students/${studentId}/`
        : 'http://127.0.0.1:8000/api/students/students/';
      const response = await fetch(endpoint, {
        method: isEditMode ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: data
      });

      if (!response.ok) {
        const errData = await response.json();
        alert('Error creating student: ' + JSON.stringify(errData));
        setLoading(false);
        return;
      }

      const updatedStudent = await response.json();
      
      // Upload new documents if any
      for (const doc of documents) {
        if (!doc.file) continue;
        const docData = new FormData();
        docData.append('file', doc.file);
        docData.append('document_type', doc.document_type || 'other');
        docData.append('title', (doc.title || doc.file.name || '').trim());

        await fetch(`http://127.0.0.1:8000/api/students/students/${updatedStudent.id}/documents/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: docData
        });
      }

      alert(isEditMode ? 'Student updated successfully!' : 'Student created successfully!');
      if (onSaved) onSaved();
      else onCancel();
    } catch (err) {
      console.error(err);
      alert('Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      {loading && <div className={styles.loadingOverlay}>Saving...</div>}
      {/* Sidebar Stepper */}
      <div className={styles.stepperSidebar}>
        <h3 className={styles.stepperTitle}>{isEditMode ? 'Edit Student' : 'Add Student'}</h3>
        
        <div className={styles.stepList}>
          {steps.map((step) => {
            const isActive = step.id === activeStep;
            const isCompleted = step.id < activeStep;
            
            return (
              <div 
                key={step.id} 
                className={`
                  ${styles.stepItem} 
                  ${isActive ? styles.stepItemActive : ''} 
                  ${isCompleted ? styles.stepItemCompleted : ''}
                `}
                onClick={() => handleStepClick(step.id)}
              >
                <div className={styles.stepCircle}>
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : step.id}
                </div>
                <div className={styles.stepLabel}>
                  <span className={styles.stepName}>{step.title}</span>
                  <span className={styles.stepDesc}>{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={styles.formContentArea}>
        
        {/* Form Header */}
        <div className={styles.formHeader}>
          <h2 className={styles.headerTitle}>Step {activeStep} of 8</h2>
          <div className={styles.headerActions}>
            <button className={styles.cancelBtn} onClick={onCancel}>
              {isEditMode ? 'Back to List' : 'Cancel Draft'}
            </button>
          </div>
        </div>

        {/* Dynamic Step Content */}
        <div className={styles.formBody}>
          {renderStepContent()}
        </div>

        {/* Pagination Footer */}
        <div className={styles.formFooter}>
          {activeStep > 1 ? (
            <button className={styles.prevBtn} onClick={handlePrev}>
              <ChevronLeft size={16} /> Previous
            </button>
          ) : (
            <div></div> // empty div for spacing 
          )}

          {activeStep < 8 ? (
            <button className={styles.nextBtn} onClick={handleNext}>
              Next Step <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              className={`${styles.nextBtn} ${styles.submitBtn}`} 
              onClick={handleSubmit}
              disabled={loading}
            >
              <Save size={16} /> {loading ? 'Saving...' : (isEditMode ? 'Update Student' : 'Final Submit')}
            </button>
          )}
        </div>

      </div>

    </div>
  );
};

export default StudentForm;
