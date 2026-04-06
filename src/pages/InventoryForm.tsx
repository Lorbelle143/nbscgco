import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { uploadToCloudinary } from '../utils/cloudinary';
import DocumentScanner from '../components/DocumentScanner';

export default function InventoryForm() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const isAdminMode = searchParams.get('admin') === 'true'; // Check if admin is creating
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSection, setCurrentSection] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');
  const [formData, setFormData] = useState({
    lastName: '', firstName: '', middleInitial: '', programYear: '', birthDate: '',
    idNo: '', gender: '', ethnicity: '', religion: '', civilStatus: '',
    mobilePhone: '', personalEmail: '', institutionalEmail: '',
    permanentAddress: '', currentAddressSame: true, currentAddress: '',
    spouseAge: '', spouseName: '', spouseOccupation: '', spouseContactNumber: '',
    isWorking: false, workingStatus: '', occupation: '',
    motherName: '', motherAge: '', motherBirthday: '',
    motherEthnicity: '', motherReligion: '', motherEducation: '', motherOccupation: '',
    motherCompany: '', motherIncome: '', motherContact: '',
    fatherName: '', fatherAge: '', fatherBirthday: '',
    fatherEthnicity: '', fatherReligion: '', fatherEducation: '', fatherOccupation: '',
    fatherCompany: '', fatherIncome: '', fatherContact: '',
    guardianName: '', guardianAge: '', guardianEthnicity: '', guardianReligion: '',
    guardianEducation: '', guardianOccupation: '', guardianCompany: '', guardianIncome: '',
    guardianContact: '', guardianAddress: '',
    parentsStatus: '', numberOfSiblings: '', birthOrder: '',
    elementarySchool: '', elementaryYears: '', elementaryAwards: '',
    juniorHighSchool: '', juniorHighYears: '', juniorHighAwards: '',
    seniorHighSchool: '', seniorHighYears: '', seniorHighAwards: '',
    hobbies: '', talents: '', sports: '', socioCivic: '', schoolOrg: '',
    hospitalized: '', hospitalizationReason: '', surgery: '', surgeryReason: '',
    chronicIllness: '', familyIllness: '', lastDoctorVisit: '', visitReason: '',
    lifeCircumstances: [] as string[], lifeCircumstancesOthers: '', relationshipOthers: '',
    counselorRemarks: '',
    // WHODAS 2.0 (36-item, scored 0-4: None=0, Mild=1, Moderate=2, Severe=3, Extreme/Cannot=4)
    whodas: {} as Record<string, number>,
    whodasDays1: '', whodasDays2: '', whodasDays3: '',
    // PID-5-BF (25 items, scored 0-3)
    pid5: {} as Record<string, number>,
    // Counseling Consent
    consentSigned: false, consentDate: '',
    studentSignatureUrl: '', parentSignatureUrl: '',
  });
  const [isDirty, setIsDirty] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  // Enable session timeout protection (always call hook, but it checks isAdminMode internally)
  useSessionTimeout();

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (editId && (user || isAdminMode)) {
      loadExistingSubmission(editId);
    } else if (!editId && !isAdminMode && user) {
      // Block new submissions if student already has one — check by both user_id AND student_id
      const checkExisting = async () => {
        // First check by user_id
        const { data: byUserId } = await supabase
          .from('inventory_submissions')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (byUserId && byUserId.length > 0) {
          alert('You have already submitted your inventory form. Only one submission is allowed per student.');
          navigate('/dashboard');
          return;
        }

        // Also check by student_id (handles user_id mismatch case)
        const { data: profile } = await supabase
          .from('profiles')
          .select('student_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.student_id) {
          const { data: byStudentId } = await supabase
            .from('inventory_submissions')
            .select('id')
            .eq('student_id', profile.student_id)
            .limit(1);

          if (byStudentId && byStudentId.length > 0) {
            alert('You have already submitted your inventory form. Only one submission is allowed per student.');
            navigate('/dashboard');
          }
        }
      };
      checkExisting();
    }
  }, [editId, user, isAdminMode]);

  const loadExistingSubmission = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setIsEditMode(true);
        
        // Merge existing data with default form structure to ensure all fields exist
        const loadedFormData = data.form_data || {};
        setFormData({
          lastName: loadedFormData.lastName || '',
          firstName: loadedFormData.firstName || '',
          middleInitial: loadedFormData.middleInitial || '',
          programYear: loadedFormData.programYear || '',
          birthDate: loadedFormData.birthDate || '',
          idNo: loadedFormData.idNo || '',
          gender: loadedFormData.gender || '',
          ethnicity: loadedFormData.ethnicity || '',
          religion: loadedFormData.religion || '',
          civilStatus: loadedFormData.civilStatus || '',
          mobilePhone: loadedFormData.mobilePhone || '',
          personalEmail: loadedFormData.personalEmail || '',
          institutionalEmail: loadedFormData.institutionalEmail || '',
          permanentAddress: loadedFormData.permanentAddress || '',
          currentAddressSame: loadedFormData.currentAddressSame !== undefined ? loadedFormData.currentAddressSame : true,
          currentAddress: loadedFormData.currentAddress || '',
          spouseAge: loadedFormData.spouseAge || '',
          spouseName: loadedFormData.spouseName || '',
          spouseOccupation: loadedFormData.spouseOccupation || '',
          spouseContactNumber: loadedFormData.spouseContactNumber || '',
          isWorking: loadedFormData.isWorking || false,
          workingStatus: loadedFormData.workingStatus || '',
          occupation: loadedFormData.occupation || '',
          motherName: loadedFormData.motherName || '',
          motherAge: loadedFormData.motherAge || '',
          motherBirthday: loadedFormData.motherBirthday || '',
          motherEthnicity: loadedFormData.motherEthnicity || '',
          motherReligion: loadedFormData.motherReligion || '',
          motherEducation: loadedFormData.motherEducation || '',
          motherOccupation: loadedFormData.motherOccupation || '',
          motherCompany: loadedFormData.motherCompany || '',
          motherIncome: loadedFormData.motherIncome || '',
          motherContact: loadedFormData.motherContact || '',
          fatherName: loadedFormData.fatherName || '',
          fatherAge: loadedFormData.fatherAge || '',
          fatherBirthday: loadedFormData.fatherBirthday || '',
          fatherEthnicity: loadedFormData.fatherEthnicity || '',
          fatherReligion: loadedFormData.fatherReligion || '',
          fatherEducation: loadedFormData.fatherEducation || '',
          fatherOccupation: loadedFormData.fatherOccupation || '',
          fatherCompany: loadedFormData.fatherCompany || '',
          fatherIncome: loadedFormData.fatherIncome || '',
          fatherContact: loadedFormData.fatherContact || '',
          guardianName: loadedFormData.guardianName || '',
          guardianAge: loadedFormData.guardianAge || '',
          guardianEthnicity: loadedFormData.guardianEthnicity || '',
          guardianReligion: loadedFormData.guardianReligion || '',
          guardianEducation: loadedFormData.guardianEducation || '',
          guardianOccupation: loadedFormData.guardianOccupation || '',
          guardianCompany: loadedFormData.guardianCompany || '',
          guardianIncome: loadedFormData.guardianIncome || '',
          guardianContact: loadedFormData.guardianContact || '',
          guardianAddress: loadedFormData.guardianAddress || '',
          parentsStatus: loadedFormData.parentsStatus || '',
          numberOfSiblings: loadedFormData.numberOfSiblings || '',
          birthOrder: loadedFormData.birthOrder || '',
          elementarySchool: loadedFormData.elementarySchool || '',
          elementaryYears: loadedFormData.elementaryYears || '',
          elementaryAwards: loadedFormData.elementaryAwards || '',
          juniorHighSchool: loadedFormData.juniorHighSchool || '',
          juniorHighYears: loadedFormData.juniorHighYears || '',
          juniorHighAwards: loadedFormData.juniorHighAwards || '',
          seniorHighSchool: loadedFormData.seniorHighSchool || '',
          seniorHighYears: loadedFormData.seniorHighYears || '',
          seniorHighAwards: loadedFormData.seniorHighAwards || '',
          hobbies: loadedFormData.hobbies || '',
          talents: loadedFormData.talents || '',
          sports: loadedFormData.sports || '',
          socioCivic: loadedFormData.socioCivic || '',
          schoolOrg: loadedFormData.schoolOrg || '',
          hospitalized: loadedFormData.hospitalized || '',
          hospitalizationReason: loadedFormData.hospitalizationReason || '',
          surgery: loadedFormData.surgery || '',
          surgeryReason: loadedFormData.surgeryReason || '',
          chronicIllness: loadedFormData.chronicIllness || '',
          familyIllness: loadedFormData.familyIllness || '',
          lastDoctorVisit: loadedFormData.lastDoctorVisit || '',
          visitReason: loadedFormData.visitReason || '',
          lifeCircumstances: loadedFormData.lifeCircumstances || [],
          lifeCircumstancesOthers: loadedFormData.lifeCircumstancesOthers || '',
          relationshipOthers: loadedFormData.relationshipOthers || '',
          counselorRemarks: loadedFormData.counselorRemarks || '',
          whodas: loadedFormData.whodas || {},
          whodasDays1: loadedFormData.whodasDays1 || '',
          whodasDays2: loadedFormData.whodasDays2 || '',
          whodasDays3: loadedFormData.whodasDays3 || '',
          pid5: loadedFormData.pid5 || {},
          consentSigned: loadedFormData.consentSigned || false,
          consentDate: loadedFormData.consentDate || '',
          studentSignatureUrl: loadedFormData.studentSignatureUrl || '',
          parentSignatureUrl: loadedFormData.parentSignatureUrl || '',
        });
        
        setExistingPhotoUrl(data.photo_url);
        setPhotoPreview(data.photo_url);
      }
    } catch (err: any) {
      setError('Failed to load submission: ' + err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setIsDirty(true);
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name === 'isWorking') {
        setFormData({ ...formData, [name]: checked });
      } else {
        const currentCircumstances = formData.lifeCircumstances;
        if (checked) {
          setFormData({ ...formData, lifeCircumstances: [...currentCircumstances, value] });
        } else {
          setFormData({ ...formData, lifeCircumstances: currentCircumstances.filter(item => item !== value) });
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Required field validation — all fields must be filled
    const required: Record<string, string> = {
      // Basic Info
      lastName: 'Last Name',
      firstName: 'First Name',
      programYear: 'Program & Year',
      idNo: 'ID No.',
      mobilePhone: 'Mobile Phone',
      birthDate: 'Birth Date',
      gender: 'Gender',
      ethnicity: 'Ethnicity',
      religion: 'Religion',
      civilStatus: 'Civil Status',
      personalEmail: 'Personal Email',
      institutionalEmail: 'Institutional Email',
      permanentAddress: 'Permanent Address',
      // Mother
      motherName: "Mother's Name",
      motherAge: "Mother's Age",
      motherEducation: "Mother's Educational Attainment",
      motherOccupation: "Mother's Occupation",
      motherIncome: "Mother's Monthly Income",
      motherContact: "Mother's Contact Number",
      // Father
      fatherName: "Father's Name",
      fatherAge: "Father's Age",
      fatherEducation: "Father's Educational Attainment",
      fatherOccupation: "Father's Occupation",
      fatherIncome: "Father's Monthly Income",
      fatherContact: "Father's Contact Number",
      // Guardian
      guardianName: "Guardian's Name",
      guardianContact: "Guardian's Contact Number",
      guardianAddress: "Guardian's Address",
      // Siblings
      parentsStatus: "Parents' Status",
      numberOfSiblings: 'Number of Siblings',
      birthOrder: 'Birth Order',
      // Education
      elementarySchool: 'Elementary School',
      elementaryYears: 'Elementary Years Attended',
      juniorHighSchool: 'Junior High School',
      juniorHighYears: 'Junior High Years Attended',
      seniorHighSchool: 'Senior High School',
      seniorHighYears: 'Senior High Years Attended',
      // Health
      hospitalized: 'Hospitalized (Yes/No)',
      surgery: 'Surgery (Yes/No)',
      chronicIllness: 'Chronic Illness',
      familyIllness: 'Family Illness',
    };
    const errors: Record<string, boolean> = {};
    const missing: string[] = [];
    for (const [field, label] of Object.entries(required)) {
      const val = formData[field as keyof typeof formData];
      if (val === undefined || val === null || val === '') {
        errors[field] = true;
        missing.push(label);
      }
    }
    if (missing.length > 0) {
      setFieldErrors(errors);
      setError(`Please fill in all required fields: ${missing.join(', ')}`);
      setCurrentSection(1);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Validate WHODAS days — must be 0–30
    const d1 = parseInt(formData.whodasDays1);
    const d2 = parseInt(formData.whodasDays2);
    const d3 = parseInt(formData.whodasDays3);
    if ((formData.whodasDays1 !== '' && (isNaN(d1) || d1 < 0 || d1 > 30)) ||
        (formData.whodasDays2 !== '' && (isNaN(d2) || d2 < 0 || d2 > 30)) ||
        (formData.whodasDays3 !== '' && (isNaN(d3) || d3 < 0 || d3 > 30))) {
      setError('WHODAS summary days (H1, H2, H3) must be between 0 and 30 only.');
      setLoading(false);
      return;
    }

    // Photo is required for new submissions (edit mode can keep existing)
    if (!isEditMode && !photoFile) {
      setError('Please upload a 1x1 photo before submitting.');
      setLoading(false);
      return;
    }

    // In edit mode, require photo if none exists yet
    if (isEditMode && !photoFile && !existingPhotoUrl) {
      setError('Please upload a 1x1 photo before submitting.');
      setLoading(false);
      return;
    }

    try {
      let photoUrl = existingPhotoUrl;

      // Generate user ID for admin mode
      const userId = isAdminMode ? '00000000-0000-0000-0000-000000000000' : user?.id;

      // Upload new photo if provided
      if (photoFile) {
        setError('📤 Uploading photo...');
        photoUrl = await uploadToCloudinary(photoFile, 'nbsc-gco/student-photos');
      }

      setError('💾 Saving to database...');

      const submissionData = {
        user_id: userId,
        student_id: formData.idNo,
        full_name: `${formData.firstName} ${formData.middleInitial} ${formData.lastName}`,
        course: formData.programYear,
        year_level: formData.programYear.split(' ')[0] || '',
        contact_number: formData.mobilePhone,
        photo_url: photoUrl || '',
        form_data: { ...formData },
        google_form_response_id: '',
      };

      if (isEditMode && editId) {
        // Update existing submission
        const { error: dbError } = await supabase
          .from('inventory_submissions')
          .update(submissionData)
          .eq('id', editId);

        if (dbError) throw dbError;
        setIsDirty(false);
        alert('✅ Submission updated successfully!');
      } else {
        // Create new submission
        const { error: dbError } = await supabase
          .from('inventory_submissions')
          .insert(submissionData);

        if (dbError) throw dbError;
        setIsDirty(false);
        alert('✅ Form submitted successfully!');
      }

      // Navigate back based on mode
      if (isAdminMode) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                  <img src="/logo.png" alt="NBSC Logo" className="w-14 h-14 object-contain" />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">
                    {isAdminMode ? 'ADMIN - ADD NEW STUDENT' : 'NORTHERN BUKIDNON STATE COLLEGE'}
                  </h1>
                  <p className="text-sm text-blue-100">GUIDANCE AND COUNSELING OFFICE</p>
                </div>
              </div>
              <button
                onClick={() => navigate(isAdminMode ? '/admin' : '/dashboard')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition backdrop-blur-sm border border-white/30"
              >
                ← Back
              </button>
            </div>
          </div>
          
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {isEditMode ? '✏️ Edit Inventory Form' : '📝 Individual Inventory Form'}
                </h2>
                <p className="text-sm text-gray-600">
                  {isEditMode ? 'Update your information below' : 'Please fill out all required fields accurately'}
                </p>
              </div>
              {isEditMode && (
                <div className="px-4 py-2 bg-amber-100 border border-amber-300 rounded-lg">
                  <p className="text-sm font-medium text-amber-800">Edit Mode</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Progress</h3>
              <span className="text-sm text-gray-500">Section {currentSection} of 2</span>
            </div>
            <div className="flex gap-3">
              {[
                { num: 1, label: 'Individual Inventory Form' },
                { num: 2, label: 'Assessments & Consent' },
              ].map((section) => (
                <button
                  key={section.num}
                  type="button"
                  onClick={() => setCurrentSection(section.num)}
                  className={`flex-1 group relative overflow-hidden rounded-xl transition-all duration-300 ${
                    currentSection === section.num
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                      : currentSection > section.num
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <div className="px-4 py-3 flex items-center justify-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      currentSection === section.num
                        ? 'bg-white/20'
                        : currentSection > section.num
                        ? 'bg-green-200'
                        : 'bg-gray-200'
                    }`}>
                      {currentSection > section.num ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        section.num
                      )}
                    </div>
                    <span className="font-semibold text-sm">{section.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              // Prevent form submission on Enter key or any accidental submit
              // Only the Submit button should trigger submission
            }}
            className="space-y-6"
          >

            {/* Section 1: Basic Information */}
            {currentSection === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-blue-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                    <p className="text-sm text-gray-500">Personal details and contact information</p>
                  </div>
                </div>
                
                {/* Photo Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Photo (1x1) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Required. Please upload a clear 1x1 photo.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="block w-full text-sm"
                  />
                  {photoPreview && <img src={photoPreview} alt="Preview" className="mt-4 w-24 h-24 object-cover rounded-lg shadow-md" />}
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.lastName ? 'border-red-500 bg-red-50' : ''}`} required />
                    {fieldErrors.lastName && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.firstName ? 'border-red-500 bg-red-50' : ''}`} required />
                    {fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">M.I.</label>
                    <input type="text" name="middleInitial" value={formData.middleInitial} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" maxLength={1} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course / Program <span className="text-red-500">*</span></label>
                    <select name="programYear" value={formData.programYear.split(' - ')[0] || ''} onChange={e => {
                      const course = e.target.value;
                      const year = formData.programYear.split(' - ')[1] || '';
                      handleChange({ target: { name: 'programYear', value: year ? `${course} - ${year}` : course } } as any);
                    }} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.programYear ? 'border-red-500 bg-red-50' : ''}`} required>
                      <option value="">Select Course</option>
                      <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                      <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                      <option value="Bachelor of Education">Bachelor of Education</option>
                    </select>
                    {fieldErrors.programYear && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year Level <span className="text-red-500">*</span></label>
                    <select value={formData.programYear.split(' - ')[1] || ''} onChange={e => {
                      const course = formData.programYear.split(' - ')[0] || '';
                      const year = e.target.value;
                      handleChange({ target: { name: 'programYear', value: course ? `${course} - ${year}` : year } } as any);
                    }} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.programYear ? 'border-red-500 bg-red-50' : ''}`} required>
                      <option value="">Select Year</option>
                      <option value="First Year">First Year</option>
                      <option value="Second Year">Second Year</option>
                      <option value="Third Year">Third Year</option>
                      <option value="Fourth Year">Fourth Year</option>
                      <option value="Fifth Year">Fifth Year</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div style={{display:'none'}}></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date <span className="text-red-500">*</span></label>
                    <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.birthDate ? 'border-red-500 bg-red-50' : ''}`} required />
                    {fieldErrors.birthDate && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID No. <span className="text-red-500">*</span></label>
                    <input type="text" name="idNo" value={formData.idNo} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.idNo ? 'border-red-500 bg-red-50' : ''}`} required />
                    {fieldErrors.idNo && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                    <select name="gender" value={formData.gender} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.gender ? 'border-red-500 bg-red-50' : ''}`} required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {fieldErrors.gender && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ethnicity <span className="text-red-500">*</span></label>
                    <select name="ethnicity" value={formData.ethnicity} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.ethnicity ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Filipino">Filipino</option>
                      <option value="Tagalog">Tagalog</option>
                      <option value="Cebuano">Cebuano</option>
                      <option value="Ilocano">Ilocano</option>
                      <option value="Bicolano">Bicolano</option>
                      <option value="Waray">Waray</option>
                      <option value="Hiligaynon">Hiligaynon</option>
                      <option value="Kapampangan">Kapampangan</option>
                      <option value="Pangasinense">Pangasinense</option>
                      <option value="Indigenous/IP">Indigenous/IP</option>
                      <option value="Others">Others</option>
                    </select>
                    {fieldErrors.ethnicity && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Religion <span className="text-red-500">*</span></label>
                    <select name="religion" value={formData.religion} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.religion ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Roman Catholic">Roman Catholic</option>
                      <option value="Islam">Islam</option>
                      <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                      <option value="Born Again Christian">Born Again Christian</option>
                      <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                      <option value="Jehovah's Witness">Jehovah's Witness</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Others">Others</option>
                      <option value="None">None</option>
                    </select>
                    {fieldErrors.religion && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Civil Status <span className="text-red-500">*</span></label>
                    <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.civilStatus ? 'border-red-500 bg-red-50' : ''}`} required>
                      <option value="">Select</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                    {fieldErrors.civilStatus && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mt-6">
                  <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Contact Information
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Phone <span className="text-red-500">*</span></label>
                    <input type="tel" name="mobilePhone" value={formData.mobilePhone} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.mobilePhone ? 'border-red-500 bg-red-50' : ''}`} required />
                    {fieldErrors.mobilePhone && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personal Email <span className="text-red-500">*</span></label>
                    <input type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.personalEmail ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.personalEmail && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institutional Email <span className="text-red-500">*</span></label>
                  <input type="email" name="institutionalEmail" value={formData.institutionalEmail} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.institutionalEmail ? 'border-red-500 bg-red-50' : ''}`} />
                  {fieldErrors.institutionalEmail && <p className="text-xs text-red-600 mt-1">Required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permanent Address <span className="text-red-500">*</span></label>
                  <textarea name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.permanentAddress ? 'border-red-500 bg-red-50' : ''}`} rows={2} required />
                  {fieldErrors.permanentAddress && <p className="text-xs text-red-600 mt-1">Required</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.currentAddressSame}
                      onChange={e => setFormData(prev => ({ ...prev, currentAddressSame: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600"
                    />
                    This is my current address
                  </label>
                  {!formData.currentAddressSame && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Present Address</label>
                      <textarea name="currentAddress" value={formData.currentAddress} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" rows={2} />
                    </div>
                  )}
                </div>

                {/* For married students only */}
                {formData.civilStatus === 'Married' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-amber-800">For married students only</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name of Spouse</label>
                        <input type="text" name="spouseName" value={formData.spouseName} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input type="number" name="spouseAge" value={formData.spouseAge} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1 cursor-pointer">
                          <input type="checkbox" name="isWorking" checked={formData.isWorking} onChange={handleChange} className="w-4 h-4 accent-blue-600" />
                          Working
                        </label>
                      </div>
                    </div>
                    {formData.isWorking && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                          <input type="text" name="spouseOccupation" value={formData.spouseOccupation} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                          <input type="tel" name="spouseContactNumber" value={formData.spouseContactNumber} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Section 1 continued: Family Background */}
            {currentSection === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-purple-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Family Background</h3>
                    <p className="text-sm text-gray-500">Information about your family members</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mt-6">
                  <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Mother's Profile
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.motherName ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.motherName && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
                    <input type="number" name="motherAge" value={formData.motherAge} onChange={handleChange} placeholder="e.g., 45" className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.motherAge ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.motherAge && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                    <input type="date" name="motherBirthday" value={formData.motherBirthday} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ethnicity</label>
                    <select name="motherEthnicity" value={formData.motherEthnicity} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Filipino">Filipino</option>
                      <option value="Tagalog">Tagalog</option>
                      <option value="Cebuano">Cebuano</option>
                      <option value="Ilocano">Ilocano</option>
                      <option value="Bicolano">Bicolano</option>
                      <option value="Waray">Waray</option>
                      <option value="Hiligaynon">Hiligaynon</option>
                      <option value="Kapampangan">Kapampangan</option>
                      <option value="Pangasinense">Pangasinense</option>
                      <option value="Indigenous/IP">Indigenous/IP</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                    <select name="motherReligion" value={formData.motherReligion} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Roman Catholic">Roman Catholic</option>
                      <option value="Islam">Islam</option>
                      <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                      <option value="Born Again Christian">Born Again Christian</option>
                      <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                      <option value="Jehovah's Witness">Jehovah's Witness</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Others">Others</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Educational Attainment <span className="text-red-500">*</span></label>
                    <select name="motherEducation" value={formData.motherEducation} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.motherEducation ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Elementary Graduate">Elementary Graduate</option>
                      <option value="Elementary Undergraduate">Elementary Undergraduate</option>
                      <option value="High School Graduate">High School Graduate</option>
                      <option value="High School Undergraduate">High School Undergraduate</option>
                      <option value="Vocational Graduate">Vocational Graduate</option>
                      <option value="College Graduate">College Graduate</option>
                      <option value="College Undergraduate">College Undergraduate</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="Doctorate Degree">Doctorate Degree</option>
                    </select>
                    {fieldErrors.motherEducation && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation <span className="text-red-500">*</span></label>
                    <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.motherOccupation ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.motherOccupation && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input type="text" name="motherCompany" value={formData.motherCompany} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income <span className="text-red-500">*</span></label>
                    <select name="motherIncome" value={formData.motherIncome} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.motherIncome ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Below ₱10,000">Below ₱10,000</option>
                      <option value="₱10,000 - ₱20,000">₱10,000 - ₱20,000</option>
                      <option value="₱20,001 - ₱30,000">₱20,001 - ₱30,000</option>
                      <option value="₱30,001 - ₱40,000">₱30,001 - ₱40,000</option>
                      <option value="₱40,001 - ₱50,000">₱40,001 - ₱50,000</option>
                      <option value="₱50,001 - ₱75,000">₱50,001 - ₱75,000</option>
                      <option value="₱75,001 - ₱100,000">₱75,001 - ₱100,000</option>
                      <option value="Above ₱100,000">Above ₱100,000</option>
                    </select>
                    {fieldErrors.motherIncome && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="motherContact" value={formData.motherContact} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.motherContact ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.motherContact && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 mt-6">
                  <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Father's Profile
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.fatherName ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.fatherName && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
                    <input type="number" name="fatherAge" value={formData.fatherAge} onChange={handleChange} placeholder="e.g., 48" className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.fatherAge ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.fatherAge && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                    <input type="date" name="fatherBirthday" value={formData.fatherBirthday} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ethnicity</label>
                    <select name="fatherEthnicity" value={formData.fatherEthnicity} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Filipino">Filipino</option>
                      <option value="Tagalog">Tagalog</option>
                      <option value="Cebuano">Cebuano</option>
                      <option value="Ilocano">Ilocano</option>
                      <option value="Bicolano">Bicolano</option>
                      <option value="Waray">Waray</option>
                      <option value="Hiligaynon">Hiligaynon</option>
                      <option value="Kapampangan">Kapampangan</option>
                      <option value="Pangasinense">Pangasinense</option>
                      <option value="Indigenous/IP">Indigenous/IP</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                    <select name="fatherReligion" value={formData.fatherReligion} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Roman Catholic">Roman Catholic</option>
                      <option value="Islam">Islam</option>
                      <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                      <option value="Born Again Christian">Born Again Christian</option>
                      <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                      <option value="Jehovah's Witness">Jehovah's Witness</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Others">Others</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Educational Attainment <span className="text-red-500">*</span></label>
                    <select name="fatherEducation" value={formData.fatherEducation} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.fatherEducation ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Elementary Graduate">Elementary Graduate</option>
                      <option value="Elementary Undergraduate">Elementary Undergraduate</option>
                      <option value="High School Graduate">High School Graduate</option>
                      <option value="High School Undergraduate">High School Undergraduate</option>
                      <option value="Vocational Graduate">Vocational Graduate</option>
                      <option value="College Graduate">College Graduate</option>
                      <option value="College Undergraduate">College Undergraduate</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="Doctorate Degree">Doctorate Degree</option>
                    </select>
                    {fieldErrors.fatherEducation && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation <span className="text-red-500">*</span></label>
                    <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.fatherOccupation ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.fatherOccupation && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input type="text" name="fatherCompany" value={formData.fatherCompany} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income <span className="text-red-500">*</span></label>
                    <select name="fatherIncome" value={formData.fatherIncome} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.fatherIncome ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Below ₱10,000">Below ₱10,000</option>
                      <option value="₱10,000 - ₱20,000">₱10,000 - ₱20,000</option>
                      <option value="₱20,001 - ₱30,000">₱20,001 - ₱30,000</option>
                      <option value="₱30,001 - ₱40,000">₱30,001 - ₱40,000</option>
                      <option value="₱40,001 - ₱50,000">₱40,001 - ₱50,000</option>
                      <option value="₱50,001 - ₱75,000">₱50,001 - ₱75,000</option>
                      <option value="₱75,001 - ₱100,000">₱75,001 - ₱100,000</option>
                      <option value="Above ₱100,000">Above ₱100,000</option>
                    </select>
                    {fieldErrors.fatherIncome && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="fatherContact" value={formData.fatherContact} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.fatherContact ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.fatherContact && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                {/* Guardian Profile */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 mt-6">
                  <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Guardian's Profile <span className="text-xs font-normal text-gray-500 ml-1">(if living with them)</span>
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <input type="text" name="guardianName" value={formData.guardianName} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.guardianName ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.guardianName && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age and Birthday</label>
                    <input type="text" name="guardianAge" value={formData.guardianAge} onChange={handleChange} placeholder="e.g., 50 / Jan 1, 1975" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ethnicity</label>
                    <select name="guardianEthnicity" value={formData.guardianEthnicity} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Filipino">Filipino</option>
                      <option value="Tagalog">Tagalog</option>
                      <option value="Cebuano">Cebuano</option>
                      <option value="Ilocano">Ilocano</option>
                      <option value="Bicolano">Bicolano</option>
                      <option value="Waray">Waray</option>
                      <option value="Hiligaynon">Hiligaynon</option>
                      <option value="Kapampangan">Kapampangan</option>
                      <option value="Pangasinense">Pangasinense</option>
                      <option value="Indigenous/IP">Indigenous/IP</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                    <select name="guardianReligion" value={formData.guardianReligion} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Roman Catholic">Roman Catholic</option>
                      <option value="Islam">Islam</option>
                      <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                      <option value="Born Again Christian">Born Again Christian</option>
                      <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                      <option value="Jehovah's Witness">Jehovah's Witness</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Others">Others</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Educational Attainment</label>
                    <select name="guardianEducation" value={formData.guardianEducation} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Elementary Graduate">Elementary Graduate</option>
                      <option value="Elementary Undergraduate">Elementary Undergraduate</option>
                      <option value="High School Graduate">High School Graduate</option>
                      <option value="High School Undergraduate">High School Undergraduate</option>
                      <option value="Vocational Graduate">Vocational Graduate</option>
                      <option value="College Graduate">College Graduate</option>
                      <option value="College Undergraduate">College Undergraduate</option>
                      <option value="Master's Degree">Master's Degree</option>
                      <option value="Doctorate Degree">Doctorate Degree</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                    <input type="text" name="guardianOccupation" value={formData.guardianOccupation} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input type="text" name="guardianCompany" value={formData.guardianCompany} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
                    <select name="guardianIncome" value={formData.guardianIncome} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg">
                      <option value="">Select</option>
                      <option value="Below ₱10,000">Below ₱10,000</option>
                      <option value="₱10,000 - ₱20,000">₱10,000 - ₱20,000</option>
                      <option value="₱20,001 - ₱30,000">₱20,001 - ₱30,000</option>
                      <option value="₱30,001 - ₱40,000">₱30,001 - ₱40,000</option>
                      <option value="₱40,001 - ₱50,000">₱40,001 - ₱50,000</option>
                      <option value="₱50,001 - ₱75,000">₱50,001 - ₱75,000</option>
                      <option value="₱75,001 - ₱100,000">₱75,001 - ₱100,000</option>
                      <option value="Above ₱100,000">Above ₱100,000</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                    <input type="tel" name="guardianContact" value={formData.guardianContact} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.guardianContact ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.guardianContact && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address <span className="text-red-500">*</span></label>
                  <textarea name="guardianAddress" value={formData.guardianAddress} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.guardianAddress ? 'border-red-500 bg-red-50' : ''}`} rows={2} />
                  {fieldErrors.guardianAddress && <p className="text-xs text-red-600 mt-1">Required</p>}
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 mt-6">
                  <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Parents Status
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status of Parents <span className="text-red-500">*</span></label>
                    <select name="parentsStatus" value={formData.parentsStatus} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.parentsStatus ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Married">Married</option>
                      <option value="Living Together">Living Together</option>
                      <option value="Single Parent">Single Parent</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced/Annulled">Divorced/Annulled</option>
                      <option value="Widowed/Widower">Widowed/Widower</option>
                    </select>
                    {fieldErrors.parentsStatus && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Siblings <span className="text-red-500">*</span></label>
                    <input type="number" name="numberOfSiblings" value={formData.numberOfSiblings} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.numberOfSiblings ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.numberOfSiblings && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birth Order <span className="text-red-500">*</span></label>
                    <input type="text" name="birthOrder" value={formData.birthOrder} onChange={handleChange} placeholder="e.g., 2nd of 4" className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.birthOrder ? 'border-red-500 bg-red-50' : ''}`} />
                    {fieldErrors.birthOrder && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                </div>

                {/* Educational Background */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 mt-6">
                  <h4 className="text-md font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Educational Background
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-amber-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-1/4">Level</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Name of School</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-1/4">Year Started – Graduated</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 w-1/5">Awards</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium text-gray-600">Elementary <span className="text-red-500">*</span></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="elementarySchool" value={formData.elementarySchool} onChange={handleChange} className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded ${fieldErrors.elementarySchool ? 'bg-red-50 ring-1 ring-red-400' : ''}`} /></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="elementaryYears" value={formData.elementaryYears} onChange={handleChange} placeholder="e.g., 2010 – 2016" className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded ${fieldErrors.elementaryYears ? 'bg-red-50 ring-1 ring-red-400' : ''}`} /></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="elementaryAwards" value={formData.elementaryAwards} onChange={handleChange} className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded" /></td>
                      </tr>
                      <tr className="bg-amber-50">
                        <td className="border border-gray-300 px-3 py-2 font-medium text-gray-600">Junior High School <span className="text-red-500">*</span></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="juniorHighSchool" value={formData.juniorHighSchool} onChange={handleChange} className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded ${fieldErrors.juniorHighSchool ? 'bg-red-50 ring-1 ring-red-400' : ''}`} /></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="juniorHighYears" value={formData.juniorHighYears} onChange={handleChange} placeholder="e.g., 2016 – 2020" className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded ${fieldErrors.juniorHighYears ? 'bg-red-50 ring-1 ring-red-400' : ''}`} /></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="juniorHighAwards" value={formData.juniorHighAwards} onChange={handleChange} className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded" /></td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 font-medium text-gray-600">Senior High School <span className="text-red-500">*</span></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="seniorHighSchool" value={formData.seniorHighSchool} onChange={handleChange} className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded ${fieldErrors.seniorHighSchool ? 'bg-red-50 ring-1 ring-red-400' : ''}`} /></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="seniorHighYears" value={formData.seniorHighYears} onChange={handleChange} placeholder="e.g., 2020 – 2022" className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded ${fieldErrors.seniorHighYears ? 'bg-red-50 ring-1 ring-red-400' : ''}`} /></td>
                        <td className="border border-gray-300 px-1 py-1"><input type="text" name="seniorHighAwards" value={formData.seniorHighAwards} onChange={handleChange} className="w-full px-2 py-1 border-0 focus:ring-1 focus:ring-amber-400 rounded" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Interests, Health & Life Circumstances */}
                <div className="space-y-6 pt-6 border-t-2 border-green-100">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-green-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Interests, Health & Life Circumstances</h3>
                    <p className="text-sm text-gray-500">Your hobbies, health status, and current concerns</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hobbies</label>
                    <input type="text" name="hobbies" value={formData.hobbies} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Talents</label>
                    <input type="text" name="talents" value={formData.talents} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sports</label>
                    <input type="text" name="sports" value={formData.sports} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Socio-civic</label>
                    <input type="text" name="socioCivic" value={formData.socioCivic} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Organizations</label>
                  <input type="text" name="schoolOrg" value={formData.schoolOrg} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                </div>

                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-4 mt-8">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Health Information
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Have you ever been hospitalized? <span className="text-red-500">*</span></label>
                    <select name="hospitalized" value={formData.hospitalized} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.hospitalized ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {fieldErrors.hospitalized && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <input type="text" name="hospitalizationReason" value={formData.hospitalizationReason} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Have you ever undergone operation? <span className="text-red-500">*</span></label>
                    <select name="surgery" value={formData.surgery} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.surgery ? 'border-red-500 bg-red-50' : ''}`}>
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {fieldErrors.surgery && <p className="text-xs text-red-600 mt-1">Required</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <input type="text" name="surgeryReason" value={formData.surgeryReason} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Do you currently suffer from any illness? <span className="text-red-500">*</span></label>
                  <input type="text" name="chronicIllness" value={formData.chronicIllness} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.chronicIllness ? 'border-red-500 bg-red-50' : ''}`} placeholder="e.g., None, Asthma, Diabetes..." />
                  {fieldErrors.chronicIllness && <p className="text-xs text-red-600 mt-1">Required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Common illness in the family <span className="text-red-500">*</span></label>
                  <input type="text" name="familyIllness" value={formData.familyIllness} onChange={handleChange} className={`w-full px-4 py-2 border rounded-lg ${fieldErrors.familyIllness ? 'border-red-500 bg-red-50' : ''}`} placeholder="e.g., None, Hypertension, Diabetes..." />
                  {fieldErrors.familyIllness && <p className="text-xs text-red-600 mt-1">Required</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">When did you last visit the doctor?</label>
                    <input type="text" name="lastDoctorVisit" value={formData.lastDoctorVisit} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for the visit</label>
                    <input type="text" name="visitReason" value={formData.visitReason} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mt-8">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Life Circumstances
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">Check any of the PROBLEMS below that currently concerns you:</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['Fear','Communication','Shyness','Loneliness','Stress','Anger','Self-confidence','Academic Performance','Career','Financial'].map((item) => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" value={item} checked={formData.lifeCircumstances.includes(item)} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">{item}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer col-span-2 md:col-span-1">
                    <input type="checkbox" value="Others" checked={formData.lifeCircumstances.includes('Others')} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Others:</span>
                    <input type="text" name="lifeCircumstancesOthers" value={formData.lifeCircumstancesOthers} onChange={handleChange} className="flex-1 px-2 py-1 border rounded text-sm" placeholder="specify" />
                  </label>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Relationship/s with:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Father','Mother','Siblings','Teachers'].map((item) => (
                      <label key={item} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" value={item} checked={formData.lifeCircumstances.includes(item)} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">{item}</span>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 cursor-pointer col-span-2 md:col-span-1">
                      <input type="checkbox" value="Others (Relationship)" checked={formData.lifeCircumstances.includes('Others (Relationship)')} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Others:</span>
                      <input type="text" name="relationshipOthers" value={formData.relationshipOthers} onChange={handleChange} className="flex-1 px-2 py-1 border rounded text-sm" placeholder="specify" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Counselor's Remarks</label>
                  <textarea name="counselorRemarks" value={formData.counselorRemarks} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg" rows={4} placeholder="For counselor use only" />
                </div>
                </div>
              </div>
            )}

            {/* Section 2: Assessments & Consent — WHODAS 2.0 + PID-5-BF + Counseling Consent */}
            {currentSection === 2 && (
              <div className="space-y-10">
                {/* Document Upload */}
                <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Supporting Documents</h3>
                      <p className="text-sm text-gray-500">Optional — upload photos or PDFs of supporting documents</p>
                    </div>
                  </div>
                  <DocumentScanner onDocumentsChange={setDocumentFiles} maxDocuments={4} />
                </div>

                <div className="flex items-center gap-3 pb-4 border-b-2 border-teal-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">WHODAS 2.0</h3>
                    <p className="text-sm text-gray-500">World Health Organization Disability Assessment Schedule 2.0 (36-item)</p>
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-teal-800">
                  <strong>Instructions:</strong> This questionnaire asks about difficulties due to health conditions. Think back over the <strong>past 30 days</strong> and answer these questions. For each question, select only one response.
                </div>

                {(() => {
                  const opts = ['None (0)', 'Mild (1)', 'Moderate (2)', 'Severe (3)', 'Extreme/Cannot (4)'];
                  const domains: { title: string; items: { id: string; text: string }[] }[] = [
                    { title: 'Understanding and communicating', items: [
                      { id: 'D1.1', text: 'Concentrating on doing something for ten minutes?' },
                      { id: 'D1.2', text: 'Remembering to do important things?' },
                      { id: 'D1.3', text: 'Analysing and finding solutions to problems in day-to-day life?' },
                      { id: 'D1.4', text: 'Learning a new task, for example, learning how to get to a new place?' },
                      { id: 'D1.5', text: 'Generally understanding what people say?' },
                      { id: 'D1.6', text: 'Starting and maintaining a conversation?' },
                    ]},
                    { title: 'Getting around', items: [
                      { id: 'D2.1', text: 'Standing for long periods such as 30 minutes?' },
                      { id: 'D2.2', text: 'Standing up from sitting down?' },
                      { id: 'D2.3', text: 'Moving around inside your home?' },
                      { id: 'D2.4', text: 'Getting out of your home?' },
                      { id: 'D2.5', text: 'Walking a long distance such as a kilometre (or equivalent)?' },
                    ]},
                    { title: 'Self-care', items: [
                      { id: 'D3.1', text: 'Washing your whole body?' },
                      { id: 'D3.2', text: 'Getting dressed?' },
                      { id: 'D3.3', text: 'Eating?' },
                      { id: 'D3.4', text: 'Staying by yourself for a few days?' },
                    ]},
                    { title: 'Getting along with people', items: [
                      { id: 'D4.1', text: 'Dealing with people you do not know?' },
                      { id: 'D4.2', text: 'Maintaining a friendship?' },
                      { id: 'D4.3', text: 'Getting along with people who are close to you?' },
                      { id: 'D4.4', text: 'Making new friends?' },
                      { id: 'D4.5', text: 'Sexual activities?' },
                    ]},
                    { title: 'Life activities', items: [
                      { id: 'D5.1', text: 'Taking care of your household responsibilities?' },
                      { id: 'D5.2', text: 'Doing most important household tasks well?' },
                      { id: 'D5.3', text: 'Getting all the household work done that you needed to do?' },
                      { id: 'D5.4', text: 'Getting your household work done as quickly as needed?' },
                    ]},
                    { title: 'Work/school activities', items: [
                      { id: 'D5.5', text: 'Your day-to-day work/school?' },
                      { id: 'D5.6', text: 'Doing your most important work/school tasks well?' },
                      { id: 'D5.7', text: 'Getting all the work done that you need to do?' },
                      { id: 'D5.8', text: 'Getting your work done as quickly as needed?' },
                    ]},
                    { title: 'Participation in society', items: [
                      { id: 'D6.1', text: 'How much of a problem did you have joining in community activities in the same way as anyone else can?' },
                      { id: 'D6.2', text: 'How much of a problem did you have because of barriers or hindrances in the world around you?' },
                      { id: 'D6.3', text: 'How much of a problem did you have living with dignity because of the attitudes and actions of others?' },
                      { id: 'D6.4', text: 'How much time did you spend on your health condition, or its consequences?' },
                      { id: 'D6.5', text: 'How much have you been emotionally affected by your health condition?' },
                      { id: 'D6.6', text: 'How much has your health been a drain on the financial resources of you or your family?' },
                      { id: 'D6.7', text: 'How much of a problem did your family have because of your health problems?' },
                      { id: 'D6.8', text: 'How much of a problem did you have in doing things by yourself for relaxation or pleasure?' },
                    ]},
                  ];

                  return (
                    <div className="space-y-6">
                      {/* WHODAS Live Score Summary */}
                      {(() => {
                        const allItems = domains.flatMap(d => d.items);
                        const answered = allItems.filter(i => formData.whodas[i.id] !== undefined).length;
                        const total = allItems.reduce((sum, i) => sum + (formData.whodas[i.id] ?? 0), 0);
                        const maxScore = allItems.length * 4; // 36 items × 4 = 144
                        const pct = Math.round((total / maxScore) * 100);
                        const severity = total === 0 ? { label: 'No Disability', color: 'text-green-700', bg: 'bg-green-50 border-green-200' }
                          : total <= 20 ? { label: 'Mild Disability', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' }
                          : total <= 40 ? { label: 'Moderate Disability', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' }
                          : { label: 'Severe Disability', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
                        return (
                          <div className={`rounded-xl border-2 p-4 ${severity.bg}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-700">WHODAS 2.0 Total Score</span>
                              <span className={`text-sm font-bold px-3 py-1 rounded-full ${severity.bg} ${severity.color} border`}>{severity.label}</span>
                            </div>
                            <div className="flex items-end gap-3 mb-2">
                              <span className={`text-4xl font-black ${severity.color}`}>{total}</span>
                              <span className="text-gray-400 text-lg mb-1">/ {maxScore}</span>
                              <span className="text-gray-400 text-sm mb-1.5">({answered}/{allItems.length} answered)</span>
                            </div>
                            <div className="w-full bg-white rounded-full h-3 border border-gray-200">
                              <div className={`h-3 rounded-full transition-all duration-300 ${total === 0 ? 'bg-green-400' : total <= 20 ? 'bg-yellow-400' : total <= 40 ? 'bg-orange-400' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-gray-500">
                              <span>0–20: Mild</span>
                              <span className="text-center">21–40: Moderate</span>
                              <span className="text-right">41–144: Severe</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Column headers */}
                      <div className="hidden md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-1 text-xs font-bold text-center text-gray-600 border-b pb-2">
                        <div className="text-left">Question</div>
                        {opts.map(o => <div key={o}>{o}</div>)}
                      </div>

                      {domains.map(domain => {
                        const domainTotal = domain.items.reduce((sum, i) => sum + (formData.whodas[i.id] ?? 0), 0);
                        const domainMax = domain.items.length * 4;
                        const domainAnswered = domain.items.filter(i => formData.whodas[i.id] !== undefined).length;
                        return (
                          <div key={domain.title}>
                            <div className="bg-teal-600 text-white text-sm font-bold px-3 py-2 rounded-t-lg flex items-center justify-between">
                              <span>{domain.title}</span>
                              <span className="text-teal-100 text-xs font-normal">
                                Subtotal: <span className="font-bold text-white">{domainTotal}/{domainMax}</span>
                                {domainAnswered < domain.items.length && <span className="ml-1 opacity-70">({domainAnswered}/{domain.items.length})</span>}
                              </span>
                            </div>
                            <div className="border border-teal-200 rounded-b-lg overflow-hidden">
                              {domain.items.map((item, idx) => (
                                <div key={item.id} className={`grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-1 items-center px-3 py-2 ${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50'}`}>
                                  <div className="text-sm text-gray-700"><span className="font-semibold text-teal-700 mr-1">{item.id}</span>{item.text}</div>
                                  {[0,1,2,3,4].map(val => (
                                    <label key={val} className="flex flex-col items-center gap-1 cursor-pointer">
                                      <span className="md:hidden text-xs text-gray-500">{opts[val]}</span>
                                      <input
                                        type="radio"
                                        name={`whodas_${item.id}`}
                                        value={val}
                                        checked={(formData.whodas[item.id] ?? -1) === val}
                                        onChange={() => setFormData(prev => ({ ...prev, whodas: { ...prev.whodas, [item.id]: val } }))}
                                        className="w-4 h-4 accent-teal-600"
                                      />
                                    </label>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* H1-H3 summary questions */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                        <p className="text-sm font-bold text-gray-700">Overall summary (past 30 days):</p>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">H1. Overall, how many days were these difficulties present? <span className="text-gray-500">(Record number of days)</span></label>
                          <input type="number" min="0" max="30" value={formData.whodasDays1}
                            onChange={e => setFormData(prev => ({ ...prev, whodasDays1: e.target.value }))}
                            className={`w-24 px-3 py-2 border rounded-lg ${Number(formData.whodasDays1) > 30 ? 'border-red-500' : ''}`} placeholder="0-30" />
                          {Number(formData.whodasDays1) > 30 && <p className="text-red-500 text-xs mt-1">Maximum is 30 days</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">H2. For how many days were you totally unable to carry out your usual activities or work because of any health condition?</label>
                          <input type="number" min="0" max="30" value={formData.whodasDays2}
                            onChange={e => setFormData(prev => ({ ...prev, whodasDays2: e.target.value }))}
                            className={`w-24 px-3 py-2 border rounded-lg ${Number(formData.whodasDays2) > 30 ? 'border-red-500' : ''}`} placeholder="0-30" />
                          {Number(formData.whodasDays2) > 30 && <p className="text-red-500 text-xs mt-1">Maximum is 30 days</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-gray-700 mb-1">H3. Not counting the days you were totally unable, for how many days did you cut back or reduce your usual activities or work?</label>
                          <input type="number" min="0" max="30" value={formData.whodasDays3}
                            onChange={e => setFormData(prev => ({ ...prev, whodasDays3: e.target.value }))}
                            className={`w-24 px-3 py-2 border rounded-lg ${Number(formData.whodasDays3) > 30 ? 'border-red-500' : ''}`} placeholder="0-30" />
                          {Number(formData.whodasDays3) > 30 && <p className="text-red-500 text-xs mt-1">Maximum is 30 days</p>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

            {/* PID-5-BF */}
            <div className="space-y-6 pt-6 border-t-2 border-violet-100">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-violet-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">PID-5-BF — Adult</h3>
                    <p className="text-sm text-gray-500">The Personality Inventory for DSM-5 — Brief Form</p>
                  </div>
                </div>

                <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 text-sm text-violet-800">
                  <strong>Instructions:</strong> This is a list of things different people might say about themselves. There are no right or wrong answers. Describe yourself as honestly as possible, selecting the response that best describes you.
                </div>

                {(() => {
                  const pid5Options = [
                    { value: 0, label: 'Very False or Often False (0)' },
                    { value: 1, label: 'Sometimes or Somewhat False (1)' },
                    { value: 2, label: 'Sometimes or Somewhat True (2)' },
                    { value: 3, label: 'Very True or Often True (3)' },
                  ];
                  const pid5Items = [
                    'People would describe me as reckless.',
                    'I feel like I act totally on impulse.',
                    "Even though I know better, I can't stop making rash decisions.",
                    'I often feel like nothing I do really matters.',
                    'Others see me as irresponsible.',
                    "I'm not good at planning ahead.",
                    "My thoughts often don't make sense to others.",
                    'I worry about almost everything.',
                    'I get emotional easily, often for very little reason.',
                    'I fear being alone in life more than anything else.',
                    "I get stuck on one way of doing things, even when it's clear it won't work.",
                    "I have seen things that weren't really there.",
                    'I steer clear of romantic relationships.',
                    "I'm not interested in making friends.",
                    'I get irritated easily by all sorts of things.',
                    "I don't like to get too close to people.",
                    "It's no big deal if I hurt other peoples' feelings.",
                    'I rarely get enthusiastic about anything.',
                    'I crave attention.',
                    'I often have to deal with people who are less important than me.',
                    'I often have thoughts that make sense to me but that other people say are strange.',
                    'I use people to get what I want.',
                    'I often "zone out" and then suddenly come to and realize that a lot of time has passed.',
                    'Things around me often feel unreal, or more real than usual.',
                    'It is easy for me to take advantage of others.',
                  ];

                  return (
                    <div className="space-y-3">
                      {/* PID-5 Live Score Summary with domain breakdown */}
                      {(() => {
                        const pid5Domains = [
                          { name: 'Negative Affect', indices: [7, 8, 9, 14, 17], color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                          { name: 'Detachment',      indices: [3, 12, 13, 15, 17], color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                          { name: 'Antagonism',      indices: [16, 19, 21, 22, 24], color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                          { name: 'Disinhibition',   indices: [0, 1, 2, 4, 5], color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                          { name: 'Psychoticism',    indices: [6, 11, 20, 22, 23], color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
                        ];
                        const grandTotal = Object.values(formData.pid5).reduce((a: number, b: number) => a + b, 0);
                        const totalAnswered = Object.keys(formData.pid5).length;
                        return (
                          <div className="bg-violet-50 border-2 border-violet-200 rounded-xl p-4 mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-gray-700">PID-5-BF Total Score</span>
                              <span className="text-xs text-gray-500">{totalAnswered}/25 answered</span>
                            </div>
                            <div className="flex items-end gap-3 mb-3">
                              <span className="text-4xl font-black text-violet-700">{grandTotal}</span>
                              <span className="text-gray-400 text-lg mb-1">/ 75</span>
                            </div>
                            <div className="w-full bg-white rounded-full h-3 border border-violet-200 mb-4">
                              <div className="h-3 rounded-full bg-violet-500 transition-all duration-300"
                                style={{ width: `${Math.round((grandTotal / 75) * 100)}%` }} />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {pid5Domains.map(d => {
                                const sub = d.indices.reduce((sum, i) => sum + (formData.pid5[i] ?? 0), 0);
                                return (
                                  <div key={d.name} className={`${d.bg} rounded-lg p-2 text-center border`}>
                                    <p className={`text-xs font-bold ${d.color} mb-1`}>{d.name}</p>
                                    <p className={`text-xl font-black ${d.color}`}>{sub}<span className="text-xs font-normal text-gray-400">/15</span></p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Header row */}
                      <div className="hidden md:grid md:grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-1 text-xs font-bold text-center text-gray-600 border-b pb-2">
                        <div className="text-left">Statement Indicator</div>
                        <div>Very False or Often False (0)</div>
                        <div>Sometimes or Somewhat False (1)</div>
                        <div>Sometimes or Somewhat True (2)</div>
                        <div>Very True or Often True (3)</div>
                      </div>

                      {pid5Items.map((text, idx) => (
                        <div key={idx} className={`grid grid-cols-1 md:grid-cols-[2.5fr_1fr_1fr_1fr_1fr] gap-1 items-center px-3 py-2 rounded-lg ${idx % 2 === 0 ? 'bg-white border border-gray-100' : 'bg-violet-50 border border-violet-100'}`}>
                          <div className="text-sm text-gray-700"><span className="font-bold text-violet-600 mr-2">{idx + 1}.</span>{text}</div>
                          {pid5Options.map(opt => (
                            <label key={opt.value} className="flex flex-col items-center gap-1 cursor-pointer">
                              <span className="md:hidden text-xs text-gray-500">{opt.label}</span>
                              <input
                                type="radio"
                                name={`pid5_${idx}`}
                                value={opt.value}
                                checked={(formData.pid5[idx] ?? -1) === opt.value}
                                onChange={() => setFormData(prev => ({ ...prev, pid5: { ...prev.pid5, [idx]: opt.value } }))}
                                className="w-4 h-4 accent-violet-600"
                              />
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            {/* Counseling Consent Form */}
            <div className="space-y-6 pt-6 border-t-2 border-blue-100">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-blue-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Counseling Consent Form</h3>
                    <p className="text-sm text-gray-500">Northern Bukidnon State College — Guidance and Counseling Office</p>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-5 text-sm text-gray-700 leading-relaxed">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-wide">Guidance and Counseling</h4>
                    <p>Guidance and Counseling is a systematic process aimed at fostering a deeper understanding of yourself, tackling your concerns, and cultivating effective strategies pertaining to your academics, behavior, personal development, and interpersonal relationships. This intricate process entails a collaborative relationship between you and a counseling professional which is driven by a committed responsibility to achieving your goals.</p>
                  </div>
                  <p>Central to this process is the disclosure of your personal information to the guidance counselor, wherein moments of anxiety or perplexity may arise. While the outcome of counseling often leans towards positive results, the degree of contentment remains varying among individuals. The outcome of counseling objectives largely relies on the active involvement of the student seeking guidance. Throughout this journey, the counselor remains a committed source of support. The termination of counseling procedures occurs upon goal attainment, referral to specialized professionals, or the client's expressed intent to conclude the sessions.</p>
                  <p>Absolute confidentiality characterizes all dealings within the procedures of Guidance and Counseling Services. This confidentiality extends to the scheduling of appointments, session content, counseling progress, standardized test results, and individual records, with no integration into academic, disciplinary, administrative, or career placement documentation. Individuals reserve the right to request, in writing, the release of specific counseling information to designated individuals.</p>

                  <div>
                    <h4 className="font-bold text-gray-900 mb-2 uppercase tracking-wide">Exceptions to Confidentiality</h4>
                    <p className="mb-2">As counseling relies on a foundation of trust between the counselor and the client, the counselor is bound to maintain the confidentiality of shared information, with exceptions based on ethical obligations that may necessitate disclosure.</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>The guidance and counseling team operates collaboratively, allowing your counselor to seek input from other counseling professionals and related experts for the purpose of delivering optimal care. These consultations strictly serve professional and educational objectives.</li>
                      <li>In instances where there is clear and immediate risk of harm or abuse to oneself or others, the guidance counselor is legally mandated to report such information to the relevant authorities responsible for ensuring safety.</li>
                      <li>A court-issued directive, authorized by a judge, could compel the Guidance and Counseling Services staff to divulge information contained within your records.</li>
                    </ul>
                  </div>

                  <p className="italic border-t pt-4">Having duly reviewed and comprehended the information pertaining to the nature and advantages of guidance and counseling, as well as the parameters of confidentiality, I hereby give my consent by signing this document.</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={formData.consentDate}
                        onChange={e => setFormData(prev => ({ ...prev, consentDate: e.target.value }))}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consentSigned}
                      onChange={e => setFormData(prev => ({ ...prev, consentSigned: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      I, <strong>{formData.firstName} {formData.middleInitial} {formData.lastName}</strong>, have read and understood the Counseling Consent Form above. I hereby give my consent to the Guidance and Counseling Office of Northern Bukidnon State College.
                    </span>
                  </label>
                  {!formData.consentSigned && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      ⚠️ Please check the box above to confirm your consent before submitting.
                    </p>
                  )}

                  {/* Signature Uploads */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-blue-200">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Student Signature</label>
                      <p className="text-xs text-gray-500 mb-2">Upload a photo/scan of your signature</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setFormData(prev => ({ ...prev, studentSignatureUrl: ev.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                      />
                      {formData.studentSignatureUrl && (
                        <div className="mt-2 relative inline-block">
                          <img src={formData.studentSignatureUrl} alt="Student signature" className="h-16 object-contain border border-gray-200 rounded bg-white p-1" />
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, studentSignatureUrl: '' }))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Parent/Guardian Signature</label>
                      <p className="text-xs text-gray-500 mb-2">Upload a photo/scan of parent/guardian signature</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setFormData(prev => ({ ...prev, parentSignatureUrl: ev.target?.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                      />
                      {formData.parentSignatureUrl && (
                        <div className="mt-2 relative inline-block">
                          <img src={formData.parentSignatureUrl} alt="Parent signature" className="h-16 object-contain border border-gray-200 rounded bg-white p-1" />
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, parentSignatureUrl: '' }))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {error && (
              <div className={`border-l-4 p-4 rounded-lg flex items-start gap-3 ${
                error.includes('📤') || error.includes('💾') 
                  ? 'bg-blue-50 border-blue-500' 
                  : 'bg-red-50 border-red-500'
              }`}>
                <svg className={`w-6 h-6 flex-shrink-0 ${
                  error.includes('📤') || error.includes('💾') 
                    ? 'text-blue-500' 
                    : 'text-red-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`font-medium ${
                    error.includes('📤') || error.includes('💾') 
                      ? 'text-blue-800' 
                      : 'text-red-800'
                  }`}>
                    {error.includes('📤') || error.includes('💾') ? 'Processing' : 'Error'}
                  </p>
                  <p className={`text-sm ${
                    error.includes('📤') || error.includes('💾') 
                      ? 'text-blue-700' 
                      : 'text-red-700'
                  }`}>{error}</p>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-8 mt-8 border-t-2 border-gray-200">
              {currentSection > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentSection(currentSection - 1)}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              )}
              
              {currentSection < 2 ? (
                <button
                  type="button"
                  onClick={() => setCurrentSection(currentSection + 1)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Next Section
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEditMode ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {isEditMode ? 'Update Form' : 'Submit Form'}
                    </>
                  )}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
