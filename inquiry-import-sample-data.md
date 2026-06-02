# Inquiry Import Sample Data With Branch And Course Name Mapping

Ye sample data inquiry import ke liye hai. Import file mein `Branch` aur `Course/Class` dono name ke form mein aayenge. Backend ko branch name se branch ka `id` find karna hai, aur course name se course ka `id` find karna hai. Inquiry save karte time branch ka id `branch_id` mein aur course ka id `course_id` ya `interestedCourse` field mein save karna hai.

| No. | Branch | First Name | Father/Husband Name | Last Name | S - Student Contact | P - Parent Contact | H - Home Contact | Email | Gender | Course/Class | Reference By | Inquiry Date | Follow Up Date | Follow Up Time | Status | Remarks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Bhestan | Aarav | Rajesh | Sharma | 9876543210 | 9876500010 | 0261123451 | aarav.sharma@example.com | Male | CCC | Website | 2026-06-01 | 2026-06-05 | 10:30 AM | Open | Interested in regular batch |
| 2 | Gododara | Zara | Imran | Khan | 9876543211 | 9876500011 | 0261123452 | zara.khan@example.com | Female | Tally Prime | Walk-in | 2026-06-01 | 2026-06-04 | 11:00 AM | Open | Asked for fee details |
| 3 | Bhestan | Rohan | Mahesh | Patel | 9876543212 | 9876500012 | 0261123453 | rohan.patel@example.com | Male | Basic Computer | Referral | 2026-06-02 | 2026-06-06 | 12:15 PM | Open | Referred by existing student |
| 4 | Gododara | Anaya | Sunil | Gupta | 9876543213 | 9876500013 | 0261123454 | anaya.gupta@example.com | Female | Advanced Excel | Social Media | 2026-06-02 | 2026-06-07 | 02:00 PM | InProgress | Wants demo class |
| 5 | Bhestan | Kabir | Kiran | Mehta | 9876543214 | 9876500014 | 0261123455 | kabir.mehta@example.com | Male | Graphic Design | Website | 2026-06-03 | 2026-06-08 | 04:30 PM | Open | Parent will visit office |
| 6 | Gododara | Meera | Pratap | Singh | 9876543215 | 9876500015 | 0261123456 | meera.singh@example.com | Female | Spoken English | Phone Call | 2026-06-03 | 2026-06-06 | 05:00 PM | Open | Needs evening batch |
| 7 | Bhestan | Aditya | Nitin | Verma | 9876543216 | 9876500016 | 0261123457 | aditya.verma@example.com | Male | Web Designing | Walk-in | 2026-06-04 | 2026-06-09 | 09:45 AM | InProgress | Asked about certificate |
| 8 | Gododara | Nisha | Pawan | Jain | 9876543217 | 9876500017 | 0261123458 | nisha.jain@example.com | Female | CCC | Referral | 2026-06-04 | 2026-06-10 | 01:30 PM | Complete | Admission confirmed |
| 9 | Bhestan | Sameer | Yusuf | Ali | 9876543218 | 9876500018 | 0261123459 | sameer.ali@example.com | Male | Tally Prime | Social Media | 2026-06-05 | 2026-06-11 | 03:15 PM | Close | Fee is high |
| 10 | Gododara | Priya | Manoj | Desai | 9876543219 | 9876500019 | 0261123460 | priya.desai@example.com | Female | Basic Computer | Website | 2026-06-05 | 2026-06-12 | 06:00 PM | Recall | Wants weekend batch |

## Columns Meaning

- `First Name`: student ka first name. Backend mein ye required hai.
- `Father/Husband Name`: father ya husband ka naam. Backend mein ye `middleName` mein save hota hai.
- `Last Name`: student ka surname/last name. Backend mein ye required hai.
- `Branch`: import file mein branch ka naam aayega. Backend is name ko branch table se match karke `branch_id` save karega.
- `S - Student Contact`: student ka mobile number. Backend mein ye required hai.
- `P - Parent Contact`: parent ka mobile number.
- `H - Home Contact`: home contact number.
- `Email`: optional email address.
- `Gender`: `Male`, `Female`, ya `Other`.
- `Course/Class`: import file mein course ka naam aayega. Backend is name ko course table se match karke course id save karega.
- `Reference By`: inquiry kahan se aayi, jaise Website, Walk-in, Referral.
- `Inquiry Date`: inquiry receive hone ki date.
- `Follow Up Date`: next follow-up ki date.
- `Follow Up Time`: next follow-up ka time.
- `Status`: inquiry ka current status.
- `Remarks`: extra note.

## Backend Save Logic

Import ke time backend ko direct branch name aur course name save nahi karna hai. Backend ko branch name se branch id aur course name se course id find karni hai. Inquiry table mein ids save honi chahiye.

Example:

| Import File Value | Database Match | Saved Value In Inquiry |
| --- | --- | --- |
| Branch = Bhestan | branches.name = Bhestan | branch_id = Bhestan branch ki id |
| Branch = Gododara | branches.name = Godadara/Gododara | branch_id = Godadara/Gododara branch ki id |
| Course/Class = CCC | courses.name = CCC | course_id/interestedCourse = CCC course ki id |
| Course/Class = Tally Prime | courses.name = Tally Prime | course_id/interestedCourse = Tally Prime course ki id |

## Matching Rules

- Branch name ko `trim` karna hai, taaki extra space se issue na aaye.
- Course name ko bhi `trim` karna hai.
- Matching case-insensitive honi chahiye, taaki `bhestan`, `Bhestan`, `BHESTAN` ya `ccc`, `CCC`, `Ccc` sab match ho sake.
- `Gododara`, `Godadara`, aur `Godadra` spelling ko same branch maana jayega.
- Agar branch database mein nahi mile, to us row ko import nahi karna chahiye.
- Agar course database mein nahi mile, to us row ko import nahi karna chahiye.
- Invalid branch wali row ke liye error dikhana chahiye: `Branch not found: Bhestan`.
- Invalid course wali row ke liye error dikhana chahiye: `Course not found: CCC`.
- Inquiry save karte time `branch_id` required hona chahiye.
- Inquiry save karte time course id bhi required ho to validation lagani chahiye.

## Backend Example Logic

```php
$branchName = trim($row['Branch']);
$courseName = trim($row['Course/Class']);

$branch = Branch::whereRaw('LOWER(name) = ?', [strtolower($branchName)])->first();
$course = Course::whereRaw('LOWER(name) = ?', [strtolower($courseName)])->first();

if (!$branch) {
    throw new Exception("Branch not found: " . $branchName);
}

if (!$course) {
    throw new Exception("Course not found: " . $courseName);
}

Inquiry::create([
    'branch_id' => $branch->id,
    'course_id' => $course->id,
    'first_name' => $row['First Name'],
    'middle_name' => $row['Father/Husband Name'],
    'last_name' => $row['Last Name'],
    'student_contact' => $row['S - Student Contact'],
    'parent_contact' => $row['P - Parent Contact'],
    'home_contact' => $row['H - Home Contact'],
    'email' => $row['Email'],
    'reference_by' => $row['Reference By'],
    'inquiry_date' => $row['Inquiry Date'],
    'follow_up_date' => $row['Follow Up Date'],
    'status' => $row['Status'],
    'remarks' => $row['Remarks'],
]);
```

## Node/Mongoose Backend Example

Is project mein agar inquiry model mein course field `interestedCourse` hai, to save logic aise hona chahiye:

```js
const branchName = String(row['Branch'] || '').trim();
const courseName = String(row['Course/Class'] || '').trim();

const branch = await Branch.findOne({
  name: { $regex: `^${escapeRegex(branchName)}$`, $options: 'i' }
});

const course = await Course.findOne({
  name: { $regex: `^${escapeRegex(courseName)}$`, $options: 'i' }
});

if (!branch) {
  throw new Error(`Branch not found: ${branchName}`);
}

if (!course) {
  throw new Error(`Course not found: ${courseName}`);
}

await Inquiry.create({
  branchId: branch._id,
  interestedCourse: course._id,
  firstName: row['First Name'],
  middleName: row['Father/Husband Name'],
  lastName: row['Last Name'],
  contactStudent: row['S - Student Contact'],
  contactParent: row['P - Parent Contact'],
  contactHome: row['H - Home Contact'],
  email: row['Email'],
  referenceBy: row['Reference By'],
  inquiryDate: row['Inquiry Date'],
  followUpDate: row['Follow Up Date'],
  status: row['Status'],
  followUpDetails: row['Remarks'],
});
```
