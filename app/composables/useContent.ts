export async function useContent() {
  const { data: profileContent } = await useAsyncData(
    'profile-content',
    () => queryCollection('profile').first(),
    { server: true },
  )

  if (!profileContent.value)
    throw new Error('Profile content not found')

  const name = profileContent.value.name
  const location = profileContent.value.location
  const email = profileContent.value.email
  const username = profileContent.value.username
  const description = profileContent.value.description
  const ogImage = profileContent.value.ogImage
  const jobTitle = profileContent.value.jobTitle
  const socials = profileContent.value.socials || []

  const birthDate = new Date(profileContent.value.birthDate)
  const age = Math.floor((Date.now() - birthDate.getTime()) / 3.15576e10)

  const { data: skillsContent } = await useAsyncData(
    'skills-content',
    () => queryCollection('skills').first(),
    { server: true },
  )

  const { data: experiencesContent } = await useAsyncData(
    'experiences-content',
    () => queryCollection('experiences').order('stem', 'ASC').all(),
    { server: true },
  )

  const { data: educationContent } = await useAsyncData(
    'education-content',
    () => queryCollection('education').order('stem', 'ASC').all(),
    { server: true },
  )

  const { data: certificationsContent } = await useAsyncData(
    'certifications-content',
    () => queryCollection('certifications').order('stem', 'ASC').all(),
    { server: true },
  )

  const { data: projectsContent } = await useAsyncData(
    'projects-content',
    () => queryCollection('projects').first(),
    { server: true },
  )

  const projectSlugs = projectsContent.value?.repos || []

  return {
    profileContent,
    name,
    location,
    email,
    username,
    description,
    ogImage,
    jobTitle,
    socials,
    age,
    skillsContent,
    experiencesContent,
    educationContent,
    certificationsContent,
    projectSlugs,
  }
}
