const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Resume = require('../src/models/Resume');

describe('Resume Model Schema', () => {
  const validUserId = new mongoose.Types.ObjectId();

  const validResumeData = {
    user: validUserId,
    personalDetails: {
      fullName: 'Alex Johnson',
      email: 'alex.johnson@example.com',
      phone: '+1-555-0123',
      location: 'New York, NY',
      headline: 'Full-Stack Software Engineer',
      summary: 'Experienced developer proficient in modern JavaScript, React, and Node.js.'
    },
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express', 'Git'],
    education: [
      {
        institution: 'Columbia University',
        qualification: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2018-09',
        endDate: '2022-05',
        description: 'Dean’s List, Senior Capstone in Distributed Systems.'
      }
    ],
    experience: [
      {
        company: 'NextGen Tech',
        jobTitle: 'Software Engineer',
        location: 'New York, NY',
        startDate: '2022-06',
        endDate: 'Present',
        description: 'Developed scalable microservices and built responsive React interfaces.'
      }
    ]
  };

  it('validates a complete and correct resume document', () => {
    const resume = new Resume(validResumeData);
    const error = resume.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(resume.user.toString(), validUserId.toString());
    assert.strictEqual(resume.personalDetails.fullName, 'Alex Johnson');
    assert.strictEqual(resume.personalDetails.email, 'alex.johnson@example.com');
    assert.strictEqual(resume.skills.length, 6);
    assert.strictEqual(resume.education.length, 1);
    assert.strictEqual(resume.experience.length, 1);
  });

  it('requires user reference', () => {
    const resume = new Resume({
      personalDetails: {
        fullName: 'Jane Doe',
        email: 'jane@example.com'
      }
    });
    const error = resume.validateSync();

    assert.ok(error, 'Expected validation error for missing user');
    assert.ok(error.errors.user);
    assert.strictEqual(error.errors.user.message, 'User reference is required');
  });

  it('requires fullName in personalDetails', () => {
    const resume = new Resume({
      user: validUserId,
      personalDetails: {
        email: 'jane@example.com'
      }
    });
    const error = resume.validateSync();

    assert.ok(error, 'Expected validation error for missing fullName');
    assert.ok(error.errors['personalDetails.fullName']);
    assert.strictEqual(error.errors['personalDetails.fullName'].message, 'Full name is required');
  });

  it('requires contact email in personalDetails', () => {
    const resume = new Resume({
      user: validUserId,
      personalDetails: {
        fullName: 'Jane Doe'
      }
    });
    const error = resume.validateSync();

    assert.ok(error, 'Expected validation error for missing email');
    assert.ok(error.errors['personalDetails.email']);
    assert.strictEqual(error.errors['personalDetails.email'].message, 'Contact email is required');
  });

  it('fails validation when personalDetails is missing on new document', () => {
    const resume = new Resume({
      user: validUserId
    });
    const error = resume.validateSync();

    assert.ok(error, 'Expected validation error when personalDetails is omitted');
    assert.ok(error.errors['personalDetails.fullName']);
    assert.ok(error.errors['personalDetails.email']);
  });

  it('validates email format in personalDetails.email', () => {
    const invalidEmails = ['invalid-email', 'jane@', '@example.com', 'jane@example', 'jane example.com'];

    for (const email of invalidEmails) {
      const resume = new Resume({
        user: validUserId,
        personalDetails: {
          fullName: 'Jane Doe',
          email
        }
      });
      const error = resume.validateSync();

      assert.ok(error, `Expected email '${email}' to fail validation`);
      assert.ok(error.errors['personalDetails.email']);
      assert.strictEqual(
        error.errors['personalDetails.email'].message,
        'Please provide a valid contact email'
      );
    }
  });

  it('enforces maximum character lengths on personalDetails fields', () => {
    // fullName max 80
    const longNameResume = new Resume({
      user: validUserId,
      personalDetails: {
        fullName: 'A'.repeat(81),
        email: 'valid@example.com'
      }
    });
    const nameErr = longNameResume.validateSync();
    assert.ok(nameErr && nameErr.errors['personalDetails.fullName']);
    assert.ok(nameErr.errors['personalDetails.fullName'].message.includes('cannot exceed 80 characters'));

    // phone max 30
    const longPhoneResume = new Resume({
      ...validResumeData,
      personalDetails: {
        ...validResumeData.personalDetails,
        phone: '1'.repeat(31)
      }
    });
    const phoneErr = longPhoneResume.validateSync();
    assert.ok(phoneErr && phoneErr.errors['personalDetails.phone']);
    assert.ok(phoneErr.errors['personalDetails.phone'].message.includes('cannot exceed 30 characters'));

    // location max 100
    const longLocationResume = new Resume({
      ...validResumeData,
      personalDetails: {
        ...validResumeData.personalDetails,
        location: 'L'.repeat(101)
      }
    });
    const locErr = longLocationResume.validateSync();
    assert.ok(locErr && locErr.errors['personalDetails.location']);
    assert.ok(locErr.errors['personalDetails.location'].message.includes('cannot exceed 100 characters'));

    // headline max 120
    const longHeadlineResume = new Resume({
      ...validResumeData,
      personalDetails: {
        ...validResumeData.personalDetails,
        headline: 'H'.repeat(121)
      }
    });
    const headErr = longHeadlineResume.validateSync();
    assert.ok(headErr && headErr.errors['personalDetails.headline']);
    assert.ok(headErr.errors['personalDetails.headline'].message.includes('cannot exceed 120 characters'));

    // summary max 2000
    const longSummaryResume = new Resume({
      ...validResumeData,
      personalDetails: {
        ...validResumeData.personalDetails,
        summary: 'S'.repeat(2001)
      }
    });
    const sumErr = longSummaryResume.validateSync();
    assert.ok(sumErr && sumErr.errors['personalDetails.summary']);
    assert.ok(sumErr.errors['personalDetails.summary'].message.includes('cannot exceed 2000 characters'));
  });

  it('defaults optional personalDetails fields to empty strings and arrays to empty arrays', () => {
    const resume = new Resume({
      user: validUserId,
      personalDetails: {
        fullName: 'Minimal Candidate',
        email: 'minimal@example.com'
      }
    });
    const error = resume.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(resume.personalDetails.phone, '');
    assert.strictEqual(resume.personalDetails.location, '');
    assert.strictEqual(resume.personalDetails.headline, '');
    assert.strictEqual(resume.personalDetails.summary, '');
    assert.deepStrictEqual(resume.skills, []);
    assert.deepStrictEqual(resume.education, []);
    assert.deepStrictEqual(resume.experience, []);
  });

  describe('Skills Validation', () => {
    it('enforces maximum 50 characters per skill item', () => {
      const resume = new Resume({
        ...validResumeData,
        skills: ['JavaScript', 'A'.repeat(51)]
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors['skills.1']);
      assert.ok(error.errors['skills.1'].message.includes('cannot exceed 50 characters'));
    });

    it('rejects empty or whitespace-only skill items', () => {
      const resume = new Resume({
        ...validResumeData,
        skills: ['JavaScript', '   ']
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors['skills.1']);
      assert.ok(error.errors['skills.1'].message.includes('Skill item cannot be empty'));
    });

    it('enforces maximum 50 skills items limit', () => {
      const fiftyOneSkills = Array.from({ length: 51 }, (_, i) => `Skill${i + 1}`);
      const resume = new Resume({
        ...validResumeData,
        skills: fiftyOneSkills
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors.skills);
      assert.ok(error.errors.skills.message.includes('Skills cannot exceed 50 items'));
    });

    it('accepts up to 50 valid skills', () => {
      const fiftySkills = Array.from({ length: 50 }, (_, i) => `Skill${i + 1}`);
      const resume = new Resume({
        ...validResumeData,
        skills: fiftySkills
      });
      const error = resume.validateSync();

      assert.strictEqual(error, undefined);
      assert.strictEqual(resume.skills.length, 50);
    });
  });

  describe('Education Subdocuments Validation', () => {
    it('generates a unique _id for each education subdocument', () => {
      const resume = new Resume({
        ...validResumeData,
        education: [
          {
            institution: 'MIT',
            qualification: 'M.S.'
          },
          {
            institution: 'Stanford',
            qualification: 'Ph.D.'
          }
        ]
      });

      assert.ok(resume.education[0]._id instanceof mongoose.Types.ObjectId);
      assert.ok(resume.education[1]._id instanceof mongoose.Types.ObjectId);
      assert.notStrictEqual(
        resume.education[0]._id.toString(),
        resume.education[1]._id.toString()
      );
    });

    it('requires institution and qualification in each education entry', () => {
      const resume = new Resume({
        ...validResumeData,
        education: [{}]
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors['education.0.institution']);
      assert.ok(error.errors['education.0.qualification']);
      assert.strictEqual(error.errors['education.0.institution'].message, 'Institution name is required');
      assert.strictEqual(error.errors['education.0.qualification'].message, 'Qualification is required');
    });

    it('enforces maximum character lengths on education fields', () => {
      const resume = new Resume({
        ...validResumeData,
        education: [
          {
            institution: 'I'.repeat(121),
            qualification: 'Q'.repeat(101),
            fieldOfStudy: 'F'.repeat(101),
            startDate: 'D'.repeat(31),
            endDate: 'D'.repeat(31),
            description: 'D'.repeat(1001)
          }
        ]
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors['education.0.institution']);
      assert.ok(error.errors['education.0.qualification']);
      assert.ok(error.errors['education.0.fieldOfStudy']);
      assert.ok(error.errors['education.0.startDate']);
      assert.ok(error.errors['education.0.endDate']);
      assert.ok(error.errors['education.0.description']);
    });

    it('enforces maximum 20 education entries limit', () => {
      const twentyOneEntries = Array.from({ length: 21 }, (_, i) => ({
        institution: `University ${i + 1}`,
        qualification: 'Bachelor of Science'
      }));
      const resume = new Resume({
        ...validResumeData,
        education: twentyOneEntries
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors.education);
      assert.ok(error.errors.education.message.includes('Education cannot exceed 20 entries'));
    });
  });

  describe('Experience Subdocuments Validation', () => {
    it('generates a unique _id for each experience subdocument', () => {
      const resume = new Resume({
        ...validResumeData,
        experience: [
          {
            company: 'Alpha Corp',
            jobTitle: 'Junior Developer'
          },
          {
            company: 'Beta LLC',
            jobTitle: 'Senior Developer'
          }
        ]
      });

      assert.ok(resume.experience[0]._id instanceof mongoose.Types.ObjectId);
      assert.ok(resume.experience[1]._id instanceof mongoose.Types.ObjectId);
      assert.notStrictEqual(
        resume.experience[0]._id.toString(),
        resume.experience[1]._id.toString()
      );
    });

    it('requires company and jobTitle in each experience entry', () => {
      const resume = new Resume({
        ...validResumeData,
        experience: [{}]
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors['experience.0.company']);
      assert.ok(error.errors['experience.0.jobTitle']);
      assert.strictEqual(error.errors['experience.0.company'].message, 'Company name is required');
      assert.strictEqual(error.errors['experience.0.jobTitle'].message, 'Job title is required');
    });

    it('enforces maximum character lengths on experience fields', () => {
      const resume = new Resume({
        ...validResumeData,
        experience: [
          {
            company: 'C'.repeat(121),
            jobTitle: 'T'.repeat(101),
            location: 'L'.repeat(101),
            startDate: 'D'.repeat(31),
            endDate: 'D'.repeat(31),
            description: 'D'.repeat(2001)
          }
        ]
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors['experience.0.company']);
      assert.ok(error.errors['experience.0.jobTitle']);
      assert.ok(error.errors['experience.0.location']);
      assert.ok(error.errors['experience.0.startDate']);
      assert.ok(error.errors['experience.0.endDate']);
      assert.ok(error.errors['experience.0.description']);
    });

    it('enforces maximum 20 experience entries limit', () => {
      const twentyOneEntries = Array.from({ length: 21 }, (_, i) => ({
        company: `Company ${i + 1}`,
        jobTitle: 'Developer'
      }));
      const resume = new Resume({
        ...validResumeData,
        experience: twentyOneEntries
      });
      const error = resume.validateSync();

      assert.ok(error);
      assert.ok(error.errors.experience);
      assert.ok(error.errors.experience.message.includes('Experience cannot exceed 20 entries'));
    });
  });

  describe('Indexes & Uniqueness', () => {
    it('declares a unique index on user to enforce at most one resume per account', () => {
      const indexes = Resume.schema.indexes();
      const userIndex = indexes.find(
        ([fields, options]) => fields.user === 1 && options && options.unique === true
      );

      assert.ok(
        userIndex,
        'Expected unique index on user field to guarantee at most one resume per candidate'
      );
    });
  });
});
