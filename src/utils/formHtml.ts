// Shared HTML builder for all 4 NBSC forms — used by both print and PDF export

export function buildFormsHtml(submission: any): string {
  const f = submission.form_data || {};
  const lc: string[] = f.lifeCircumstances || [];
  const age = f.birthDate ? (new Date().getFullYear() - new Date(f.birthDate).getFullYear()) : '';

  const cb = (v: boolean) =>
    `<span style="display:inline-block;width:11px;height:11px;border:1.5px solid #000;margin-right:2px;text-align:center;line-height:10px;font-size:9px;vertical-align:middle;">${v ? '✓' : ''}</span>`;

  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#000;}
    .page{width:210mm;height:297mm;overflow:hidden;break-after:page;page-break-after:always;position:relative;}
    .page:last-child{break-after:auto;page-break-after:auto;}
    /* Page 1: scale to fit all content */
    .p1-inner{width:114.9%;transform:scale(0.87);transform-origin:top left;padding:8mm 12mm 5mm 12mm;display:flex;flex-direction:column;height:114.9%;}
    /* Pages 2,3,4 */
    .pn-inner{padding:10mm 12mm 8mm 12mm;display:flex;flex-direction:column;height:100%;}
    .page-content{flex:1;display:flex;flex-direction:column;}
    table{width:100%;border-collapse:collapse;}
    td,th{border:1px solid #000;padding:2px 5px;vertical-align:top;font-size:11px;}
    .lbl{font-size:11px;font-weight:bold;color:#111;white-space:nowrap;}
    .val{font-size:11px;min-height:15px;}
    .sec{background:#000;color:#fff;font-weight:bold;font-size:11px;padding:3px 5px;margin:3px 0 1px;}
    .wr td{padding:1px 3px!important;font-size:9.5px!important;line-height:1.15;border-color:#bbb;}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      @page{size:A4;margin:0;}
    }
  `;

  // ── Shared footer ─────────────────────────────────────────────────────────
  const footerHtml = `
  <div style="margin-top:auto;padding-top:3px;">
    <div style="border-top:2px solid #7a9cc8;margin:0 0 4px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 8px;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <img src="/bagong-pilipinas.jpg" alt="Bagong Pilipinas" style="width:38px;height:55px;object-fit:contain;"/>
        <span style="font-size:6.5px;font-weight:bold;color:#0038A8;text-align:center;">BAGONG PILIPINAS</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="/fb-logo.png" alt="Facebook" style="width:24px;height:24px;object-fit:contain;border-radius:50%;"/>
        <span style="font-size:9px;color:#4a6fa5;">NorthernBukidnonStateCollegeOfficial</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:16px;color:#4a6fa5;">&#9993;</span>
        <span style="font-size:9px;color:#4a6fa5;">www.nbsc.edu.ph</span>
      </div>
    </div>
  </div>`;

  // ── Header: logo left | college name center | doc-code box right ──────────
  // Matches the docx exactly — full-width line below the whole header row
  const makeHeader = (docCode: string, pageNo: string) => `
  <div style="display:flex;align-items:center;margin-bottom:0;">
    <div style="flex:0 0 95px;text-align:center;">
      <img src="/nbsc-logo.png" alt="NBSC Logo" crossorigin="anonymous" style="width:88px;height:88px;object-fit:contain;display:block;margin:0 auto;"/>
    </div>
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="font-size:10px;color:#000;letter-spacing:0.3px;">Republic of the Philippines</div>
      <div style="font-size:20px;font-weight:bold;text-transform:uppercase;color:#000;line-height:1.2;letter-spacing:0.5px;">Northern Bukidnon State College</div>
      <div style="font-size:11px;color:#000;margin-top:2px;">Manolo Fortich, 8703 Bukidnon</div>
      <div style="font-size:9.5px;font-style:italic;color:#c8a000;margin-top:2px;">Creando Futura, Transformationis Vitae, Ductae a Deo</div>
    </div>
    <div style="flex:0 0 auto;">
      <table style="border-collapse:collapse;font-size:8px;width:175px;border:1px solid #4a6fa5;">
        <tr>
          <td colspan="4" style="border:1px solid #4a6fa5;padding:3px 4px;font-weight:bold;text-align:center;background:#1a3a6b;color:#fff;font-size:8px;">Document Code Number</td>
        </tr>
        <tr>
          <td colspan="4" style="border:1px solid #4a6fa5;padding:3px 4px;text-align:center;font-weight:bold;font-size:10px;color:#1a3a6b;">${docCode}</td>
        </tr>
        <tr>
          <td style="border:1px solid #4a6fa5;padding:2px;font-weight:bold;text-align:center;font-size:7px;background:#1a3a6b;color:#fff;">Issue Status</td>
          <td style="border:1px solid #4a6fa5;padding:2px;font-weight:bold;text-align:center;font-size:7px;background:#1a3a6b;color:#fff;">Rev No.</td>
          <td style="border:1px solid #4a6fa5;padding:2px;font-weight:bold;text-align:center;font-size:7px;background:#1a3a6b;color:#fff;">Effective Date</td>
          <td style="border:1px solid #4a6fa5;padding:2px;font-weight:bold;text-align:center;font-size:7px;background:#1a3a6b;color:#fff;">Page No.</td>
        </tr>
        <tr>
          <td style="border:1px solid #4a6fa5;padding:2px;text-align:center;font-size:8px;">01</td>
          <td style="border:1px solid #4a6fa5;padding:2px;text-align:center;font-size:8px;">00</td>
          <td style="border:1px solid #4a6fa5;padding:2px;text-align:center;font-size:8px;">12.15.2025</td>
          <td style="border:1px solid #4a6fa5;padding:2px;text-align:center;font-size:8px;">${pageNo}</td>
        </tr>
      </table>
    </div>
  </div>
  <div style="border-top:2px solid #7a9cc8;margin:5px 0 7px;"></div>`;

  // ── Header without doc-code box (pages 2 & 3) ─────────────────────────────
  const makeHeaderSimple = () => `
  <div style="display:flex;align-items:center;margin-bottom:0;">
    <div style="flex:0 0 95px;text-align:center;">
      <img src="/nbsc-logo.png" alt="NBSC Logo" crossorigin="anonymous" style="width:88px;height:88px;object-fit:contain;display:block;margin:0 auto;"/>
    </div>
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="font-size:10px;color:#000;letter-spacing:0.3px;">Republic of the Philippines</div>
      <div style="font-size:20px;font-weight:bold;text-transform:uppercase;color:#000;line-height:1.2;letter-spacing:0.5px;">Northern Bukidnon State College</div>
      <div style="font-size:11px;color:#000;margin-top:2px;">Manolo Fortich, 8703 Bukidnon</div>
      <div style="font-size:9.5px;font-style:italic;color:#c8a000;margin-top:2px;">Creando Futura, Transformationis Vitae, Ductae a Deo</div>
    </div>
  </div>
  <div style="border-top:2px solid #7a9cc8;margin:5px 0 7px;"></div>`;

  // ── PAGE 1: Individual Inventory Form ────────────────────────────────────
  const page1 = `
<div class="page">
<div class="p1-inner">
  <div class="page-content">
  ${makeHeader('FM-NBSC-GCO-002','1 of 1')}

  <div style="text-align:center;margin:2px 0 4px;">
    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">INDIVIDUAL INVENTORY FORM</div>
  </div>

  <!-- Name/ID + Photo -->
  <div style="display:flex;gap:4px;margin-bottom:1px;">
    <table style="flex:1;margin-bottom:0;">
      <tr>
        <td style="padding:2px 4px;font-size:9px;color:#555;width:22%;">Last Name</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;width:24%;">First Name</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;width:9%;">M.I.</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;width:22%;">Program &amp; Year</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;">Birth Date</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;font-size:11px;">${f.lastName||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.firstName||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.middleInitial||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.programYear||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.birthDate||''}</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;font-size:9px;color:#555;">ID No.</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;">Gender</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;">Ethnicity</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;">Religion</td>
        <td style="padding:2px 4px;font-size:9px;color:#555;">Civil Status</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;font-size:11px;">${f.idNo||submission.student_id||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.gender||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.ethnicity||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.religion||''}</td>
        <td style="padding:2px 4px;font-size:11px;">${f.civilStatus||''}</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;font-size:9px;color:#555;" colspan="5">Permanent Address</td>
      </tr>
      <tr>
        <td style="padding:2px 4px;font-size:11px;" colspan="5">${f.permanentAddress||''}</td>
      </tr>
    </table>
    <div style="flex:0 0 96px;border:1.5px solid #555;width:96px;height:96px;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden;">
      ${submission.photo_url
        ? `<img src="${submission.photo_url}" alt="Photo" crossorigin="anonymous" style="width:96px;height:96px;object-fit:cover;display:block;"/>`
        : `<div style="text-align:center;color:#555;"><div style="font-size:12px;font-weight:bold;">1X1</div><div style="font-size:9px;">PHOTO</div></div>`}
    </div>
  </div>

  <div class="sec">Contact Information</div>
  <table style="margin-bottom:1px;">
    <tr>
      <td class="lbl" style="width:110px;">Mobile Phone Number/s</td>
      <td class="val">${f.mobilePhone||''}</td>
      <td class="lbl" style="width:110px;">Personal e-mail address</td>
      <td class="val">${f.personalEmail||''}</td>
      <td class="lbl" style="width:100px;">Institutional address</td>
      <td class="val">${f.institutionalEmail||''}</td>
    </tr>
    <tr>
      <td class="lbl">Permanent Address:</td>
      <td class="val" colspan="5">${f.permanentAddress||''}</td>
    </tr>
    <tr>
      <td colspan="6" class="val">
        This is my current address: ${cb(f.currentAddressSame===true||f.currentAddressSame==='true')} Yes &nbsp;
        ${cb(!f.currentAddressSame||f.currentAddressSame===false||f.currentAddressSame==='false')} No &nbsp;&nbsp;
        Present Address: ${f.currentAddress||''}
      </td>
    </tr>
    <tr>
      <td colspan="2" class="val" style="font-style:italic;font-size:8.5px;">For married students only</td>
      <td colspan="2" class="val">Name of Spouse: ${f.spouseName||''}</td>
      <td class="lbl">Age:</td>
      <td class="val">${f.spouseAge||''}</td>
    </tr>
    <tr>
      <td class="lbl">Working:</td>
      <td class="val">${cb(f.isWorking===true||f.isWorking==='true')} Yes &nbsp; ${cb(!f.isWorking||f.isWorking===false||f.isWorking==='false')} No</td>
      <td class="lbl">If working:</td>
      <td class="lbl">Occupation</td>
      <td class="lbl">Contact number</td>
      <td class="val">${f.occupation||f.spouseOccupation||''}</td>
    </tr>
  </table>

  <div class="sec">Family Background</div>
  <table style="margin-bottom:1px;">
    <tr>
      <th class="lbl" style="width:100px;">Profile</th>
      <th class="lbl" style="text-align:center;">Mother</th>
      <th class="lbl" style="text-align:center;">Father</th>
      <th class="lbl" style="text-align:center;">Guardian <span style="font-weight:normal;font-size:7.5px;">(if living with them)</span></th>
    </tr>
    <tr><td class="lbl">Name</td><td class="val">${f.motherName||''}</td><td class="val">${f.fatherName||''}</td><td class="val">${f.guardianName||''}</td></tr>
    <tr><td class="lbl">Age and Birthday</td><td class="val">${f.motherAge||''} / ${f.motherBirthday||''}</td><td class="val">${f.fatherAge||''} / ${f.fatherBirthday||''}</td><td class="val">${f.guardianAge||''}</td></tr>
    <tr><td class="lbl">Ethnicity</td><td class="val">${f.motherEthnicity||''}</td><td class="val">${f.fatherEthnicity||''}</td><td class="val">${f.guardianEthnicity||''}</td></tr>
    <tr><td class="lbl">Religion</td><td class="val">${f.motherReligion||''}</td><td class="val">${f.fatherReligion||''}</td><td class="val">${f.guardianReligion||''}</td></tr>
    <tr><td class="lbl">Educational Attainment</td><td class="val">${f.motherEducation||''}</td><td class="val">${f.fatherEducation||''}</td><td class="val">${f.guardianEducation||''}</td></tr>
    <tr><td class="lbl">Occupation</td><td class="val">${f.motherOccupation||''}</td><td class="val">${f.fatherOccupation||''}</td><td class="val">${f.guardianOccupation||''}</td></tr>
    <tr><td class="lbl">Company</td><td class="val">${f.motherCompany||''}</td><td class="val">${f.fatherCompany||''}</td><td class="val">${f.guardianCompany||''}</td></tr>
    <tr><td class="lbl">Monthly Income</td><td class="val">${f.motherIncome||''}</td><td class="val">${f.fatherIncome||''}</td><td class="val">${f.guardianIncome||''}</td></tr>
    <tr><td class="lbl">Contact Number</td><td class="val">${f.motherContact||''}</td><td class="val">${f.fatherContact||''}</td><td class="val">${f.guardianContact||''}</td></tr>
    <tr><td class="lbl">Address</td><td class="val" colspan="3">${f.guardianAddress||''}</td></tr>
  </table>
  <table style="margin-bottom:1px;">
    <tr>
      <td colspan="4" class="val">
        Status of Parent/s: &nbsp;
        ${cb(f.parentsStatus==='Married')} Married &nbsp;
        ${cb(f.parentsStatus==='Living Together')} Living Together &nbsp;
        ${cb(f.parentsStatus==='Divorced/Annulled')} Divorced/Annulled &nbsp;
        ${cb(f.parentsStatus==='Single Parent')} Single Parent &nbsp;
        ${cb(f.parentsStatus==='Separated')} Separated &nbsp;
        ${cb(f.parentsStatus==='Widowed/Widower')} Widowed/Widower
      </td>
    </tr>
    <tr>
      <td class="lbl" style="width:120px;">Number of Sibling/s:</td>
      <td class="val" style="width:90px;">${f.numberOfSiblings||''}</td>
      <td class="lbl" style="width:70px;">Birth Order:</td>
      <td class="val">${f.birthOrder||''}</td>
    </tr>
  </table>

  <div class="sec">Educational Background</div>
  <table style="margin-bottom:1px;">
    <tr>
      <th class="lbl" style="width:100px;">Level</th>
      <th class="lbl">Name of the School</th>
      <th class="lbl" style="width:140px;">Year Started – Year Graduated</th>
      <th class="lbl" style="width:90px;">Awards</th>
    </tr>
    <tr><td class="lbl">Elementary</td><td class="val">${f.elementarySchool||''}</td><td class="val">${f.elementaryYears||''}</td><td class="val">${f.elementaryAwards||''}</td></tr>
    <tr><td class="lbl">Junior High School</td><td class="val">${f.juniorHighSchool||''}</td><td class="val">${f.juniorHighYears||''}</td><td class="val">${f.juniorHighAwards||''}</td></tr>
    <tr><td class="lbl">Senior High School</td><td class="val">${f.seniorHighSchool||''}</td><td class="val">${f.seniorHighYears||''}</td><td class="val">${f.seniorHighAwards||''}</td></tr>
  </table>

  <div class="sec">Interest &amp; Recreational Activities</div>
  <table style="margin-bottom:1px;">
    <tr>
      <td class="lbl" style="width:50px;">Hobbies</td><td class="val">${f.hobbies||''}</td>
      <td class="lbl" style="width:42px;">Talents</td><td class="val">${f.talents||''}</td>
      <td class="lbl" style="width:42px;">Sports</td><td class="val">${f.sports||''}</td>
    </tr>
    <tr>
      <td class="lbl">Socio-civic:</td><td class="val">${f.socioCivic||''}</td>
      <td class="lbl">School Org:</td><td class="val" colspan="3">${f.schoolOrg||''}</td>
    </tr>
  </table>

  <div class="sec">Health</div>
  <table style="margin-bottom:1px;">
    <tr><td class="val" colspan="4">• Have you ever been hospitalized? ${cb(f.hospitalized==='Yes')} Yes (state when/reason: ${f.hospitalizationReason||''}) &nbsp;${cb(f.hospitalized==='No'||!f.hospitalized)} No</td></tr>
    <tr><td class="val" colspan="4">• Have you ever had an operation? ${cb(f.surgery==='Yes')} Yes (state when/reason: ${f.surgeryReason||''}) &nbsp;${cb(f.surgery==='No'||!f.surgery)} No</td></tr>
    <tr><td class="val" colspan="4">• Do you currently suffer from any illness/condition? ${cb(!!f.chronicIllness)} Yes (state illness: ${f.chronicIllness||''}) &nbsp;${cb(!f.chronicIllness)} No</td></tr>
    <tr>
      <td class="lbl" style="width:160px;">Common illness in the family:</td>
      <td class="val" colspan="3">${f.familyIllness||''}</td>
    </tr>
    <tr>
      <td class="lbl">When did you last see a doctor?</td>
      <td class="val">${f.lastDoctorVisit||''}</td>
      <td class="lbl" style="width:130px;">Reason for the visit:</td>
      <td class="val">${f.visitReason||''}</td>
    </tr>
  </table>

  <div class="sec">Life Circumstances</div>
  <div style="border:1px solid #000;padding:2px 5px;margin-bottom:2px;">
    <div style="font-size:9.5px;margin-bottom:1px;">Check any of the PROBLEMS below that currently concerns you:</div>
    <div style="font-size:10.5px;line-height:1.8;">
      ${cb(lc.includes('Fear'))} Fear &nbsp;&nbsp;
      ${cb(lc.includes('Communication'))} Communication &nbsp;&nbsp;
      ${cb(lc.includes('Shyness'))} Shyness &nbsp;&nbsp;
      ${cb(lc.includes('Loneliness'))} Loneliness &nbsp;&nbsp;
      ${cb(lc.includes('Stress'))} Stress &nbsp;&nbsp;
      ${cb(lc.includes('Anger'))} Anger &nbsp;&nbsp;
      ${cb(lc.includes('Self-confidence'))} Self-confidence &nbsp;&nbsp;
      ${cb(lc.includes('Academic Performance'))} Academic Performance &nbsp;&nbsp;
      ${cb(lc.includes('Career'))} Career &nbsp;&nbsp;
      ${cb(lc.includes('Financial'))} Financial &nbsp;&nbsp;
      ${cb(lc.includes('Others'))} Others: ${f.lifeCircumstancesOthers||'___________'}
    </div>
    <div style="font-size:10.5px;">
      ${cb(lc.includes('Relationship'))} Relationship/s with: &nbsp;
      ${cb(lc.includes('Father'))} Father &nbsp;
      ${cb(lc.includes('Mother'))} Mother &nbsp;
      ${cb(lc.includes('Siblings'))} Siblings &nbsp;
      ${cb(lc.includes('Teachers'))} Teachers &nbsp;
      ${cb(lc.includes('Others (Relationship)'))} Others: ${f.relationshipOthers||'___________'}
    </div>
  </div>

  <!-- Signatures -->
  <table style="width:100%;border-collapse:collapse;margin-top:3px;">
    <tr>
      <td style="border:none;width:36%;vertical-align:bottom;padding:0 12px 0 0;">
        <div style="margin-top:20px;border-top:1px solid #000;padding-top:2px;text-align:center;font-size:10px;">
          ${f.studentSignatureUrl
            ? `<img src="${f.studentSignatureUrl}" style="height:40px;object-fit:contain;display:block;margin:0 auto 2px;"/>`
            : '<div style="min-height:40px;"></div>'}
          <div style="font-style:italic;font-size:11px;min-height:12px;text-transform:uppercase;">${(f.firstName||'').toUpperCase()} ${f.middleInitial ? (f.middleInitial+'.').toUpperCase() : ''} ${(f.lastName||'').toUpperCase()}</div>
          Student's signature over printed name
        </div>
      </td>
      <td style="border:none;vertical-align:top;padding:0;">
        <div style="font-size:10px;font-weight:bold;margin-bottom:1px;">Counselor's Remarks:</div>
        <div style="border-bottom:1px solid #000;min-height:11px;font-size:11px;margin-bottom:2px;">${f.counselorRemarks||''}</div>
        <div style="border-bottom:1px solid #000;min-height:11px;font-size:11px;margin-bottom:2px;"></div>
        <div style="font-size:10px;font-weight:bold;margin-bottom:1px;">Assessed by:</div>
        <div style="border-bottom:1px solid #000;min-height:11px;font-size:11px;margin-bottom:4px;"></div>
        <div style="border-top:1px solid #000;padding-top:2px;text-align:center;font-size:10px;">
          <img src="/counselor-signature.jpg" alt="Counselor Signature" style="height:55px;object-fit:contain;display:block;margin:0 auto 2px;"/>
          <div style="font-weight:bold;font-size:11px;min-height:12px;text-transform:uppercase;">JO AUGUSTINE G. CORPUZ, RGC</div>
          Guidance Counselor's Name and Signature
        </div>
      </td>
    </tr>
  </table>
  </div><!-- end page-content -->
  ${footerHtml}
</div><!-- end p1-inner -->
</div>`;

  // ── PAGE 2: WHODAS 2.0 ────────────────────────────────────────────────────
  const whodas = f.whodas || {};
  const whodasDomains = [
    { title: 'D1 — Understanding and communicating', items: [
      {id:'D1.1',text:'Concentrating on doing something for ten minutes?'},
      {id:'D1.2',text:'Remembering to do important things?'},
      {id:'D1.3',text:'Analysing and finding solutions to problems in day-to-day life?'},
      {id:'D1.4',text:'Learning a new task, e.g. learning how to get to a new place?'},
      {id:'D1.5',text:'Generally understanding what people say?'},
      {id:'D1.6',text:'Starting and maintaining a conversation?'},
    ]},
    { title: 'D2 — Getting around', items: [
      {id:'D2.1',text:'Standing for long periods such as 30 minutes?'},
      {id:'D2.2',text:'Standing up from sitting down?'},
      {id:'D2.3',text:'Moving around inside your home?'},
      {id:'D2.4',text:'Getting out of your home?'},
      {id:'D2.5',text:'Walking a long distance such as a kilometre?'},
    ]},
    { title: 'D3 — Self-care', items: [
      {id:'D3.1',text:'Washing your whole body?'},
      {id:'D3.2',text:'Getting dressed?'},
      {id:'D3.3',text:'Eating?'},
      {id:'D3.4',text:'Staying by yourself for a few days?'},
    ]},
    { title: 'D4 — Getting along with people', items: [
      {id:'D4.1',text:'Dealing with people you do not know?'},
      {id:'D4.2',text:'Maintaining a friendship?'},
      {id:'D4.3',text:'Getting along with people who are close to you?'},
      {id:'D4.4',text:'Making new friends?'},
      {id:'D4.5',text:'Sexual activities?'},
    ]},
    { title: 'D5 — Life activities (household)', items: [
      {id:'D5.1',text:'Taking care of your household responsibilities?'},
      {id:'D5.2',text:'Doing most important household tasks well?'},
      {id:'D5.3',text:'Getting all the household work done that you needed to do?'},
      {id:'D5.4',text:'Getting your household work done as quickly as needed?'},
    ]},
    { title: 'D5 — Life activities (work/school)', items: [
      {id:'D5.5',text:'Your day-to-day work/school?'},
      {id:'D5.6',text:'Doing your most important work/school tasks well?'},
      {id:'D5.7',text:'Getting all the work done that you need to do?'},
      {id:'D5.8',text:'Getting your work done as quickly as needed?'},
    ]},
    { title: 'D6 — Participation in society', items: [
      {id:'D6.1',text:'Joining in community activities in the same way as anyone else?'},
      {id:'D6.2',text:'Problems because of barriers or hindrances in the world around you?'},
      {id:'D6.3',text:'Living with dignity because of attitudes and actions of others?'},
      {id:'D6.4',text:'How much time did you spend on your health condition or its consequences?'},
      {id:'D6.5',text:'How much have you been emotionally affected by your health condition?'},
      {id:'D6.6',text:'How much has your health been a drain on financial resources of you or your family?'},
      {id:'D6.7',text:'How much of a problem did your family have because of your health problems?'},
      {id:'D6.8',text:'Problems doing things by yourself for relaxation or pleasure?'},
    ]},
  ];

  let wRows = '';
  whodasDomains.forEach(d => {
    wRows += `<tr><td colspan="7" style="background:#eee;border:1px solid #000;font-weight:bold;font-size:9px;padding:2px 5px;">${d.title}</td></tr>`;
    d.items.forEach((item, i) => {
      const val = whodas[item.id];
      const bg = i%2===0?'#fff':'#f5f5f5';
      wRows += `<tr class="wr" style="background:${bg};">
        <td style="width:46%;">${item.id} &nbsp;${item.text}</td>
        ${[0,1,2,3,4].map(v=>`<td style="text-align:center;">${val===v?'✓':''}</td>`).join('')}
        <td style="text-align:center;font-weight:bold;">${val!==undefined?val:''}</td>
      </tr>`;
    });
  });

  const page2 = `
<div class="page">
<div class="pn-inner">
  <div class="page-content">
  ${makeHeaderSimple()}

  <div style="text-align:center;margin:2px 0 4px;">
    <div style="font-weight:bold;font-size:12px;">World Health Organization Disability Assessment Schedule 2.0 (WHODAS 2.0)</div>
    <div style="font-size:9.5px;margin-top:1px;">36-item version, self-administered</div>
  </div>

  <table style="margin-bottom:3px;">
    <tr>
      <th style="background:#ddd;font-size:8.5px;width:16%;">Last Name</th>
      <td style="font-size:9.5px;width:20%;">${f.lastName||''}</td>
      <th style="background:#ddd;font-size:8.5px;width:14%;">First Name</th>
      <td style="font-size:9.5px;width:20%;">${f.firstName||''}</td>
      <th style="background:#ddd;font-size:8.5px;width:5%;">M.I.</th>
      <td style="font-size:9.5px;width:5%;">${f.middleInitial||''}</td>
      <th style="background:#ddd;font-size:8.5px;width:5%;">Age</th>
      <td style="font-size:9.5px;width:5%;">${age}</td>
    </tr>
    <tr>
      <th style="background:#ddd;font-size:8.5px;">Sex</th>
      <td style="font-size:9.5px;">${f.gender||''}</td>
      <th style="background:#ddd;font-size:8.5px;" colspan="2">Program &amp; Year</th>
      <td style="font-size:9.5px;" colspan="4">${f.programYear||''}</td>
    </tr>
  </table>

  <div style="margin-bottom:3px;border:1px solid #000;padding:3px 5px;background:#f9f9f9;font-size:10px;">
    <strong>Instructions:</strong> Think back over the <strong>past 30 days</strong>. Rate how much difficulty you had in each area due to a health condition. Select only one response per item.
  </div>

  <table style="font-size:10px;">
    <thead>
      <tr>
        <th style="background:#ddd;text-align:left;width:46%;padding:2px 4px;">In the past 30 days, how much difficulty did you have in:</th>
        <th style="background:#ddd;text-align:center;width:9%;padding:2px;">None<br>(0)</th>
        <th style="background:#ddd;text-align:center;width:9%;padding:2px;">Mild<br>(1)</th>
        <th style="background:#ddd;text-align:center;width:9%;padding:2px;">Moderate<br>(2)</th>
        <th style="background:#ddd;text-align:center;width:9%;padding:2px;">Severe<br>(3)</th>
        <th style="background:#ddd;text-align:center;width:12%;padding:2px;">Extreme/<br>Cannot (4)</th>
        <th style="background:#ddd;text-align:center;width:6%;padding:2px;">Score</th>
      </tr>
    </thead>
    <tbody>${wRows}</tbody>
  </table>

  <div style="margin-top:3px;">
    <div style="background:#eee;padding:2px 5px;border:1px solid #000;font-size:8.5px;font-weight:bold;">Summary Questions (past 30 days)</div>
    <table style="font-size:8.5px;">
      <tr><td style="width:85%;">H1. Overall, how many days were these difficulties present?</td><td style="font-weight:bold;">${f.whodasDays1||'___'} days</td></tr>
      <tr><td>H2. For how many days were you totally unable to carry out your usual activities or work?</td><td style="font-weight:bold;">${f.whodasDays2||'___'} days</td></tr>
      <tr><td>H3. Not counting the days totally unable, for how many days did you cut back or reduce your usual activities?</td><td style="font-weight:bold;">${f.whodasDays3||'___'} days</td></tr>
    </table>
  </div>

  <p style="font-size:8.5px;text-align:center;margin-top:3px;font-style:italic;">This completes the questionnaire. Thank you for your participation.</p>
  </div><!-- end page-content -->
  ${footerHtml}
</div><!-- end pn-inner -->
</div>`;

  // ── PAGE 3: PID-5-BF ──────────────────────────────────────────────────────
  const pid5 = f.pid5 || {};
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

  let pRows = '';
  pid5Items.forEach((text, i) => {
    const val = pid5[i];
    const bg = i%2===0?'#fff':'#f5f0ff';
    pRows += `<tr style="background:${bg};">
      <td style="text-align:center;width:4%;padding:2px;">${i+1}</td>
      <td style="padding:2px 5px;">${text}</td>
      ${[0,1,2,3].map(v=>`<td style="text-align:center;padding:2px;">${val===v?'✓':''}</td>`).join('')}
      <td style="text-align:center;font-weight:bold;padding:2px;">${val!==undefined?val:''}</td>
    </tr>`;
  });

  const pid5Total = Object.values(pid5 as Record<string,number>).reduce((a,b)=>a+b,0);
  const pid5Ans = Object.keys(pid5).length;

  const page3 = `
<div class="page">
<div class="pn-inner">
  <div class="page-content">
  ${makeHeaderSimple()}
  <table style="margin-bottom:4px;">
    <tr>
      <td class="lbl" style="width:65px;">Last Name</td><td class="val" style="width:100px;">${f.lastName||''}</td>
      <td class="lbl" style="width:60px;">First Name</td><td class="val" style="width:100px;">${f.firstName||''}</td>
      <td class="lbl" style="width:25px;">M.I.</td><td class="val" style="width:25px;">${f.middleInitial||''}</td>
      <td class="lbl" style="width:25px;">Age</td><td class="val" style="width:25px;">${age}</td>
      <td class="lbl" style="width:24px;">Sex</td><td class="val" style="width:35px;">${f.gender?f.gender.charAt(0):''}</td>
    </tr>
    <tr>
      <td class="lbl">Program &amp; Year</td><td class="val" colspan="3">${f.programYear||''}</td>
      <td class="lbl">Date</td><td class="val" colspan="5">${f.consentDate||''}</td>
    </tr>
  </table>
  <div style="text-align:center;margin-bottom:4px;">
    <div style="font-size:13px;font-weight:bold;">The Personality Inventory for DSM-5 — Brief Form (PID-5-BF) — Adult</div>
  </div>
  <div style="font-size:10.5px;border:1px solid #ccc;padding:3px 6px;margin-bottom:4px;background:#f9f9f9;">
    <strong>Instructions:</strong> This is a list of things different people might say about themselves. There are no right or wrong answers. Describe yourself as honestly as possible, selecting the response that best describes you.
  </div>
  <table style="font-size:10.5px;">
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="text-align:center;width:4%;padding:2px;">#</th>
        <th style="text-align:left;padding:2px 5px;">Statement</th>
        <th style="text-align:center;width:11%;padding:2px;font-size:9px;">Very False or Often False (0)</th>
        <th style="text-align:center;width:11%;padding:2px;font-size:9px;">Sometimes or Somewhat False (1)</th>
        <th style="text-align:center;width:11%;padding:2px;font-size:9px;">Sometimes or Somewhat True (2)</th>
        <th style="text-align:center;width:11%;padding:2px;font-size:9px;">Very True or Often True (3)</th>
        <th style="text-align:center;width:7%;padding:2px;">Score</th>
      </tr>
    </thead>
    <tbody>${pRows}</tbody>
    <tfoot>
      <tr style="background:#f0f0f0;">
        <td colspan="6" style="text-align:right;padding:2px 5px;">Total / Partial Raw Score:</td>
        <td style="text-align:center;font-weight:bold;">${pid5Total}</td>
      </tr>
      <tr>
        <td colspan="6" style="text-align:right;padding:2px 5px;font-size:8.5px;">Prorated Total Score (if 1–6 items unanswered):</td>
        <td style="text-align:center;font-size:8.5px;">${pid5Ans<25&&pid5Ans>=19?(pid5Total/pid5Ans*25).toFixed(1):'N/A'}</td>
      </tr>
      <tr>
        <td colspan="6" style="text-align:right;padding:2px 5px;font-size:8.5px;">Average Total Score:</td>
        <td style="text-align:center;font-size:8.5px;">${pid5Ans>0?(pid5Total/pid5Ans).toFixed(2):'N/A'}</td>
      </tr>
    </tfoot>
  </table>
  </div><!-- end page-content -->
  ${footerHtml}
</div><!-- end pn-inner -->
</div>`;

  // ── PAGE 4: Informed Consent ───────────────────────────────────────────────
  const page4 = `
<div class="page">
<div class="pn-inner">
  <div class="page-content">
  ${makeHeader('FM-NBSC-GCO-004','1 of 1')}
  <div style="text-align:center;font-size:15px;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin:5px 0 8px;letter-spacing:0.5px;">INFORMED CONSENT FORM</div>

  <div style="font-size:11.5px;line-height:1.7;text-align:justify;">
    <p style="font-weight:bold;text-transform:uppercase;margin-bottom:5px;">Guidance and Counseling</p>
    <p style="margin-bottom:7px;">Guidance and Counseling is a systematic process aimed at fostering a deeper understanding of yourself, tackling your concerns, and cultivating effective strategies pertaining to your academics, behavior, personal development, and interpersonal relationships. This intricate process entails a collaborative relationship between you and a counseling professional which is driven by a committed responsibility to achieving your goals.</p>
    <p style="margin-bottom:7px;">Central to this process is the disclosure of your personal information to the guidance counselor, wherein moments of anxiety or perplexity may arise. While the outcome of counseling often leans towards positive results, the degree of contentment remains varying among individuals. The outcome of counseling objectives largely relies on the active involvement of the student seeking guidance. Throughout this journey, the counselor remains a committed source of support. The termination of counseling procedures occurs upon goal attainment, referral to specialized professionals, or the client's expressed intent to conclude the sessions.</p>
    <p style="margin-bottom:7px;">Absolute confidentiality characterizes all dealings within the procedures of Guidance and Counseling Services. This confidentiality extends to the scheduling of appointments, session content, counseling progress, standardized test results, and individual records, with no integration into academic, disciplinary, administrative, or career placement documentation. Individuals reserve the right to request, in writing, the release of specific counseling information to designated individuals.</p>
    <p style="font-weight:bold;text-transform:uppercase;margin-bottom:5px;margin-top:8px;">Exceptions to Confidentiality</p>
    <p style="margin-bottom:5px;">As counseling relies on a foundation of trust between the counselor and the client, the counselor is bound to maintain the confidentiality of shared information, with exceptions based on ethical obligations that may necessitate disclosure.</p>
    <ul style="margin-left:20px;margin-bottom:7px;">
      <li style="margin-bottom:4px;">The guidance and counseling team operates collaboratively, allowing your counselor to seek input from other counseling professionals and related experts for the purpose of delivering optimal care. These consultations strictly serve professional and educational objectives.</li>
      <li style="margin-bottom:4px;">In instances where there is clear and immediate risk of harm or abuse to oneself or others, the guidance counselor is legally mandated to report such information to the relevant authorities responsible for ensuring safety.</li>
      <li style="margin-bottom:4px;">A court-issued directive, authorized by a judge, could compel the Guidance and Counseling Services staff to divulge information contained within your records.</li>
    </ul>
    <p style="margin-top:10px;margin-bottom:16px;">Having duly reviewed and comprehended the information pertaining to the nature and advantages of guidance and counseling, as well as the parameters of confidentiality, I hereby give my consent by signing this document.</p>
  </div>

  <div style="display:flex;gap:20px;margin-top:8px;">
    <div style="flex:1;text-align:center;font-size:11.5px;">
      <div style="min-height:34px;border-bottom:1.5px solid #000;margin-bottom:4px;font-style:italic;text-transform:uppercase;">
        ${f.studentSignatureUrl ? `<img src="${f.studentSignatureUrl}" style="height:30px;object-fit:contain;display:inline-block;"/>` : ''}
        ${f.consentSigned?`${(f.firstName||'').toUpperCase()} ${f.middleInitial?(f.middleInitial+'.').toUpperCase():''} ${(f.lastName||'').toUpperCase()}`:''}</div>
      Name and Signature of Student
    </div>
    <div style="flex:1;text-align:center;font-size:11.5px;">
      <div style="min-height:34px;border-bottom:1.5px solid #000;margin-bottom:4px;font-style:italic;text-transform:uppercase;">
        ${f.parentSignatureUrl ? `<img src="${f.parentSignatureUrl}" style="height:30px;object-fit:contain;display:inline-block;"/>` : ''}
        ${((f.fatherName||f.motherName||f.guardianName||'')).toUpperCase()}</div>
      Name and Signature of Parents/Guardians
    </div>
  </div>
  <div style="display:flex;gap:20px;margin-top:16px;">
    <div style="flex:1;text-align:center;font-size:11.5px;">
      <div style="min-height:50px;border-bottom:1.5px solid #000;margin-bottom:4px;font-weight:bold;text-transform:uppercase;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:2px;">
        <img src="/counselor-signature.jpg" alt="Counselor Signature" style="height:55px;object-fit:contain;display:block;margin-bottom:2px;"/>
        JO AUGUSTINE G. CORPUZ, RGC
      </div>
      Name and Signature of Guidance Officer
    </div>
    <div style="width:140px;text-align:center;font-size:11.5px;">
      <div style="min-height:34px;border-bottom:1.5px solid #000;margin-bottom:4px;">${f.consentDate||''}</div>
      Date:
    </div>
  </div>
  </div><!-- end page-content -->
  ${footerHtml}
</div><!-- end pn-inner -->
</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>NBSC Forms — ${submission.full_name||''}</title>
  <style>${css}</style>
</head>
<body>
${page1}
${page2}
${page3}
${page4}
</body>
</html>`;
}


// ── Mental Health Assessment Form HTML ────────────────────────────────────────
// Builds an NBSC-styled official document for a single student's MH assessment(s)
export function buildMentalHealthFormHtml(studentName: string, studentId: string, assessments: any[]): string {
  const origin = window.location.origin;

  // checkbox helper — same as inventory form
  const cb = (v: boolean) =>
    `<span style="display:inline-block;width:11px;height:11px;border:1.5px solid #000;margin-right:2px;text-align:center;line-height:10px;font-size:9px;vertical-align:middle;">${v ? '✓' : ''}</span>`;

  const getRiskLabel = (level: string) => {
    if (level === 'immediate-support') return 'NEED IMMEDIATE SUPPORT';
    if (level === 'need-support') return 'YOU NEED SUPPORT';
    return 'DOING WELL';
  };
  const getRiskColor = (level: string) => {
    if (level === 'immediate-support') return '#dc2626';
    if (level === 'need-support') return '#d97706';
    return '#16a34a';
  };
  const getRiskBg = (level: string) => {
    if (level === 'immediate-support') return '#fee2e2';
    if (level === 'need-support') return '#ffedd5';
    return '#dcfce7';
  };

  // exact same CSS as inventory form
  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#000;}
    .page{width:210mm;height:297mm;overflow:hidden;break-after:page;page-break-after:always;position:relative;}
    .page:last-child{break-after:auto;page-break-after:auto;}
    .inner{width:114.9%;transform:scale(0.87);transform-origin:top left;padding:8mm 12mm 5mm 12mm;display:flex;flex-direction:column;height:114.9%;}
    .page-content{flex:1;display:flex;flex-direction:column;}
    table{width:100%;border-collapse:collapse;}
    td,th{border:1px solid #000;padding:2px 5px;vertical-align:top;font-size:11px;}
    .lbl{font-size:11px;font-weight:bold;color:#111;white-space:nowrap;}
    .val{font-size:11px;min-height:15px;}
    .sec{background:#000;color:#fff;font-weight:bold;font-size:11px;padding:3px 5px;margin:3px 0 1px;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:A4;margin:0;}}
  `;

  // exact same footer as inventory form
  const footerHtml = `
  <div style="margin-top:auto;padding-top:3px;">
    <div style="border-top:2px solid #7a9cc8;margin:0 0 4px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 8px;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <img src="${origin}/bagong-pilipinas.jpg" alt="Bagong Pilipinas" style="width:38px;height:55px;object-fit:contain;"/>
        <span style="font-size:6.5px;font-weight:bold;color:#0038A8;text-align:center;">BAGONG PILIPINAS</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="${origin}/fb-logo.png" alt="Facebook" style="width:24px;height:24px;object-fit:contain;border-radius:50%;"/>
        <span style="font-size:9px;color:#4a6fa5;">NorthernBukidnonStateCollegeOfficial</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:16px;color:#4a6fa5;">&#9993;</span>
        <span style="font-size:9px;color:#4a6fa5;">www.nbsc.edu.ph</span>
      </div>
    </div>
  </div>`;

  const makeHeader = (_pageNo: string) => `
  <div style="display:flex;align-items:center;margin-bottom:0;">
    <div style="flex:0 0 95px;text-align:center;">
      <img src="${origin}/nbsc-logo.png" alt="NBSC Logo" crossorigin="anonymous" style="width:88px;height:88px;object-fit:contain;display:block;margin:0 auto;"/>
    </div>
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="font-size:10px;color:#000;letter-spacing:0.3px;">Republic of the Philippines</div>
      <div style="font-size:20px;font-weight:bold;text-transform:uppercase;color:#000;line-height:1.2;letter-spacing:0.5px;">Northern Bukidnon State College</div>
      <div style="font-size:11px;color:#000;margin-top:2px;">Manolo Fortich, 8703 Bukidnon</div>
      <div style="font-size:9.5px;font-style:italic;color:#c8a000;margin-top:2px;">Creando Futura, Transformationis Vitae, Ductae a Deo</div>
    </div>
  </div>
  <div style="border-top:2px solid #7a9cc8;margin:5px 0 7px;"></div>`;

  // BSRS-5 questions — exact text from MentalHealthAssessment.tsx
  const questions = [
    { key: 'feeling_alone',           label: 'Trouble falling asleep' },
    { key: 'feeling_blue',            label: 'Feeling tense or keyed up' },
    { key: 'feeling_easily_annoyed',  label: 'Feeling easily annoyed or irritated' },
    { key: 'feeling_tense_anxious',   label: 'Feeling blue' },
    { key: 'feeling_inferior',        label: 'Feeling inferior to others' },
  ];
  const scaleOptions = ['Never (0)', 'Rarely (1)', 'Sometimes (2)', 'Often (3)', 'Always (4)'];

  const pages = assessments.map((a, idx) => {
    const pageNo = `${idx + 1} of ${assessments.length}`;
    const dateStr = new Date(a.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
    const suicidalVal: number = a.having_suicidal_thoughts ?? 0;

    // score rows — same style as WHODAS rows in inventory form
    const qRows = questions.map((q, qi) => {
      const val: number = a[q.key] ?? 0;
      const bg = qi % 2 === 0 ? '#fff' : '#f5f5f5';
      return `<tr style="background:${bg};">
        <td style="text-align:center;width:4%;padding:2px 3px;">${qi + 1}</td>
        <td style="width:46%;padding:2px 5px;">${q.label}</td>
        ${[0,1,2,3,4].map(v => `<td style="text-align:center;padding:2px;">${val === v ? '✓' : ''}</td>`).join('')}
        <td style="text-align:center;font-weight:bold;padding:2px;">${val}</td>
      </tr>`;
    }).join('');

    // suicidal thoughts row — red highlight if > 0
    const suicidalBg = suicidalVal > 0 ? '#fee2e2' : '#fff0f0';
    const suicidalRow = `<tr style="background:${suicidalBg};">
      <td style="text-align:center;width:4%;padding:2px 3px;${suicidalVal > 0 ? 'color:#dc2626;font-weight:bold;' : ''}">6</td>
      <td style="width:46%;padding:2px 5px;${suicidalVal > 0 ? 'color:#dc2626;font-weight:bold;' : ''}">Having suicidal thoughts ${suicidalVal > 0 ? '⚠️' : ''}<br/><span style="font-size:9px;font-weight:normal;color:#666;">(Not included in total score — any value triggers immediate support)</span></td>
      ${[0,1,2,3,4].map(v => `<td style="text-align:center;padding:2px;${suicidalVal > 0 && suicidalVal === v ? 'color:#dc2626;font-weight:bold;' : ''}">${suicidalVal === v ? '✓' : ''}</td>`).join('')}
      <td style="text-align:center;font-weight:bold;padding:2px;${suicidalVal > 0 ? 'color:#dc2626;' : ''}">${suicidalVal}</td>
    </tr>`;

    const scoreInterp = a.total_score <= 10
      ? 'You are doing well (0–10). No significant distress detected.'
      : a.total_score <= 13
      ? 'You need support (11–13). Mild to moderate distress. Counseling recommended.'
      : 'Need immediate support (14–20). Significant distress. Immediate counseling required.';

    return `
<div class="page">
<div class="inner">
<div class="page-content">
  ${makeHeader(pageNo)}

  <div style="text-align:center;margin:2px 0 4px;">
    <div style="font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">MENTAL HEALTH ASSESSMENT RECORD</div>
    <div style="font-size:10px;color:#4a6fa5;margin-top:1px;">Brief Symptom Rating Scale — 5 (BSRS-5)</div>
  </div>

  <div class="sec">Student Information</div>
  <table style="margin-bottom:1px;">
    <tr>
      <td class="lbl" style="width:110px;">Student Name:</td>
      <td class="val">${studentName}</td>
      <td class="lbl" style="width:90px;">Student ID:</td>
      <td class="val" style="width:120px;">${studentId}</td>
      <td class="lbl" style="width:80px;">Date:</td>
      <td class="val" style="width:130px;">${dateStr}</td>
    </tr>
  </table>

  <div style="border:1px solid #000;padding:3px 5px;margin-bottom:2px;background:#f9f9f9;font-size:10px;">
    <strong>Instructions:</strong> Please rate how much you have been bothered by each of the following symptoms <strong>during the past week</strong>, including today.
  </div>

  <div class="sec">Assessment Items</div>
  <table style="font-size:10.5px;">
    <thead>
      <tr>
        <th style="text-align:center;width:4%;padding:2px;">#</th>
        <th style="text-align:left;width:46%;padding:2px 5px;">Symptom / Question</th>
        ${scaleOptions.map(l => `<th style="text-align:center;font-size:8.5px;padding:2px;">${l}</th>`).join('')}
        <th style="text-align:center;width:7%;padding:2px;">Score</th>
      </tr>
    </thead>
    <tbody>
      ${qRows}
      ${suicidalRow}
    </tbody>
    <tfoot>
      <tr style="background:#1a3a6b;color:#fff;">
        <td colspan="7" style="text-align:right;font-weight:bold;font-size:11px;padding:3px 6px;border-color:#4a6fa5;">Total Score (Items 1–5):</td>
        <td style="text-align:center;font-weight:bold;font-size:13px;border-color:#4a6fa5;">${a.total_score}/20</td>
      </tr>
    </tfoot>
  </table>

  <div class="sec">Assessment Result</div>
  <table style="margin-bottom:1px;">
    <tr>
      <td class="lbl" style="width:110px;">Total Score:</td>
      <td class="val" style="font-weight:bold;font-size:13px;width:60px;">${a.total_score} / 20</td>
      <td class="lbl" style="width:90px;">Risk Level:</td>
      <td style="padding:3px 6px;">
        <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:bold;background:${getRiskBg(a.risk_level)};color:${getRiskColor(a.risk_level)};border:1.5px solid ${getRiskColor(a.risk_level)};">
          ${getRiskLabel(a.risk_level)}
        </span>
      </td>
    </tr>
    <tr>
      <td class="lbl">Interpretation:</td>
      <td class="val" colspan="3">${scoreInterp}</td>
    </tr>
    <tr>
      <td class="lbl">Requires Counseling:</td>
      <td class="val">${cb(!!a.requires_counseling)} Yes &nbsp; ${cb(!a.requires_counseling)} No</td>
      <td class="lbl">Suicidal Thoughts:</td>
      <td class="val" style="${suicidalVal > 0 ? 'color:#dc2626;font-weight:bold;' : ''}">${suicidalVal > 0 ? '⚠️ YES — Immediate attention required' : cb(false)+' None reported'}</td>
    </tr>
  </table>

  <div style="border:1px solid #000;padding:3px 5px;margin-bottom:2px;background:#f9f9f9;font-size:9.5px;">
    <strong>Scoring Guide:</strong> &nbsp;
    ${cb(a.total_score <= 10)} 0–10: Doing Well &nbsp;&nbsp;
    ${cb(a.total_score >= 11 && a.total_score <= 13)} 11–13: Need Support &nbsp;&nbsp;
    ${cb(a.total_score >= 14)} 14–20: Need Immediate Support &nbsp;&nbsp;
    <strong style="color:#dc2626;">⚠️ Any suicidal thoughts = Immediate Support regardless of score</strong>
  </div>

  <div class="sec">Counselor's Remarks</div>
  <table style="margin-bottom:2px;">
    <tr>
      <td style="height:55px;font-size:11px;vertical-align:top;">${a.counseling_notes || ''}</td>
    </tr>
    <tr>
      <td style="height:16px;font-size:11px;"></td>
    </tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:4px;">
    <tr>
      <td style="border:none;width:40%;vertical-align:bottom;padding:0 16px 0 0;">
        <div style="margin-top:20px;border-top:1px solid #000;padding-top:2px;text-align:center;font-size:10px;">
          <div style="font-style:italic;font-size:11px;min-height:12px;text-transform:uppercase;">${studentName.toUpperCase()}</div>
          Student's Signature over Printed Name
        </div>
      </td>
      <td style="border:none;width:20%;"></td>
      <td style="border:none;width:40%;vertical-align:bottom;padding:0;">
        <div style="margin-top:20px;border-top:1px solid #000;padding-top:2px;text-align:center;font-size:10px;">
          <img src="${origin}/counselor-signature.jpg" alt="Counselor Signature" style="height:55px;object-fit:contain;display:block;margin:0 auto 2px;"/>
          <div style="font-weight:bold;font-size:11px;min-height:12px;text-transform:uppercase;">JO AUGUSTINE G. CORPUZ, RGC</div>
          Guidance Counselor's Name and Signature
        </div>
      </td>
    </tr>
  </table>

  <div style="margin-top:5px;padding:3px 8px;background:#fef3c7;border:1px solid #f59e0b;font-size:9px;color:#92400e;text-align:center;">
    CONFIDENTIAL — For authorized personnel only &nbsp;|&nbsp; Northern Bukidnon State College — Guidance and Counseling Office
  </div>
</div>
${footerHtml}
</div>
</div>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mental Health Assessment — ${studentName}</title>
  <style>${css}</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}


// ── All-assessments list report (NBSC styled) ─────────────────────────────────
export function buildMentalHealthListHtml(assessments: any[]): string {
  const origin = window.location.origin;

  const getRiskLabel = (level: string) => {
    if (level === 'immediate-support') return 'IMMEDIATE SUPPORT';
    if (level === 'need-support') return 'NEED SUPPORT';
    return 'DOING WELL';
  };
  const getRiskColor = (level: string) => {
    if (level === 'immediate-support') return '#dc2626';
    if (level === 'need-support') return '#d97706';
    return '#16a34a';
  };
  const getRiskBg = (level: string) => {
    if (level === 'immediate-support') return '#fee2e2';
    if (level === 'need-support') return '#ffedd5';
    return '#dcfce7';
  };

  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#000;}
    .page{width:210mm;height:297mm;overflow:hidden;}
    .inner{width:114.9%;transform:scale(0.87);transform-origin:top left;padding:8mm 12mm 5mm 12mm;display:flex;flex-direction:column;height:114.9%;}
    table{width:100%;border-collapse:collapse;}
    td,th{border:1px solid #000;padding:3px 5px;vertical-align:middle;font-size:10px;}
    th{background:#1a3a6b;color:#fff;font-size:10px;padding:5px;}
    tr:nth-child(even) td{background:#f8fafc;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:A4;margin:0;}}
  `;

  const footerHtml = `
  <div style="margin-top:auto;padding-top:3px;">
    <div style="border-top:2px solid #7a9cc8;margin:0 0 4px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 8px;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <img src="${origin}/bagong-pilipinas.jpg" alt="Bagong Pilipinas" style="width:38px;height:55px;object-fit:contain;"/>
        <span style="font-size:6.5px;font-weight:bold;color:#0038A8;text-align:center;">BAGONG PILIPINAS</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="${origin}/fb-logo.png" alt="Facebook" style="width:24px;height:24px;object-fit:contain;border-radius:50%;"/>
        <span style="font-size:9px;color:#4a6fa5;">NorthernBukidnonStateCollegeOfficial</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:16px;color:#4a6fa5;">&#9993;</span>
        <span style="font-size:9px;color:#4a6fa5;">www.nbsc.edu.ph</span>
      </div>
    </div>
  </div>`;

  const header = `
  <div style="display:flex;align-items:center;margin-bottom:0;">
    <div style="flex:0 0 95px;text-align:center;">
      <img src="${origin}/nbsc-logo.png" alt="NBSC Logo" crossorigin="anonymous" style="width:88px;height:88px;object-fit:contain;display:block;margin:0 auto;"/>
    </div>
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="font-size:10px;color:#000;letter-spacing:0.3px;">Republic of the Philippines</div>
      <div style="font-size:20px;font-weight:bold;text-transform:uppercase;color:#000;line-height:1.2;letter-spacing:0.5px;">Northern Bukidnon State College</div>
      <div style="font-size:11px;color:#000;margin-top:2px;">Manolo Fortich, 8703 Bukidnon</div>
      <div style="font-size:9.5px;font-style:italic;color:#c8a000;margin-top:2px;">Creando Futura, Transformationis Vitae, Ductae a Deo</div>
    </div>
  </div>
  <div style="border-top:2px solid #7a9cc8;margin:5px 0 7px;"></div>`;

  const rows = assessments.map((a, i) => `<tr>
    <td style="text-align:center;">${i + 1}</td>
    <td>${a.full_name || ''}</td>
    <td>${a.student_id || ''}</td>
    <td style="text-align:center;font-weight:bold;">${a.total_score}/20</td>
    <td style="text-align:center;">
      <span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:9px;font-weight:bold;background:${getRiskBg(a.risk_level)};color:${getRiskColor(a.risk_level)};border:1px solid ${getRiskColor(a.risk_level)};">
        ${getRiskLabel(a.risk_level)}
      </span>
    </td>
    <td style="text-align:center;">${a.requires_counseling ? '⚠️ Yes' : 'No'}</td>
    <td style="text-align:center;${a.having_suicidal_thoughts > 0 ? 'color:#dc2626;font-weight:bold;' : ''}">${a.having_suicidal_thoughts > 0 ? '⚠️ Yes' : 'No'}</td>
    <td style="text-align:center;">${new Date(a.created_at).toLocaleDateString()}</td>
  </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Mental Health Assessments — NBSC GCO</title>
  <style>${css}</style>
</head>
<body>
<div class="page">
<div class="inner">
  ${header}
  <div style="text-align:center;margin:2px 0 4px;">
    <div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">MENTAL HEALTH ASSESSMENT REPORT (BSRS-5)</div>
  </div>
  <div style="text-align:center;font-size:9px;color:#64748b;margin-bottom:6px;">
    Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Assessments: ${assessments.length}
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:4%;">#</th>
        <th>Student Name</th>
        <th style="width:13%;">Student ID</th>
        <th style="width:8%;text-align:center;">Score</th>
        <th style="width:18%;text-align:center;">Risk Level</th>
        <th style="width:10%;text-align:center;">Counseling</th>
        <th style="width:12%;text-align:center;">Suicidal Thoughts</th>
        <th style="width:10%;text-align:center;">Date</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;">No assessments</td></tr>'}</tbody>
  </table>
  <div style="margin-top:8px;padding:4px 8px;background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;font-size:9px;color:#92400e;text-align:center;">
    CONFIDENTIAL — For authorized personnel only &nbsp;|&nbsp; Northern Bukidnon State College — Guidance and Counseling Office
  </div>
  ${footerHtml}
</div>
</div>
</body>
</html>`;
}
